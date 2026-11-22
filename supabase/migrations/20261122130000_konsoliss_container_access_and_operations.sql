-- Konsoliss controlled by Wantiss Super Admin, not by any vendor dashboard.
-- Mirrors migrations applied in live Supabase:
-- konsoliss_container_status_read_model,
-- konsoliss_super_admin_container_operations,
-- konsoliss_current_container_only_read_policy.

create table if not exists public.konsoliss_containers (
  id uuid primary key default gen_random_uuid(),
  container_number text not null unique,
  status text not null default 'filling'
    check (status in ('filling','filled','departed','arrived')),
  updated_at timestamptz not null default now(),
  constraint konsoliss_container_number_nonempty
    check (length(trim(container_number)) between 2 and 40)
);
create table if not exists public.konsoliss_container_assignments (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references public.konsoliss_containers(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_current boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique(container_id,user_id)
);
create unique index if not exists konsoliss_one_current_container_per_user
  on public.konsoliss_container_assignments(user_id) where is_current;
create index if not exists konsoliss_assignments_container_idx
  on public.konsoliss_container_assignments(container_id);
create index if not exists konsoliss_assignments_user_idx
  on public.konsoliss_container_assignments(user_id);
alter table public.konsoliss_containers enable row level security;
alter table public.konsoliss_container_assignments enable row level security;
drop policy if exists "Customers read only their container assignments"
  on public.konsoliss_container_assignments;
create policy "Customers read only their container assignments"
  on public.konsoliss_container_assignments for select to authenticated
  using(user_id=(select auth.uid()));
drop policy if exists "Customers read only containers assigned to them"
  on public.konsoliss_containers;
drop policy if exists "Customers read only their current container"
  on public.konsoliss_containers;
create policy "Customers read only their current container"
  on public.konsoliss_containers for select to authenticated
  using(exists (
    select 1 from public.konsoliss_container_assignments a
    where a.container_id=id and a.user_id=(select auth.uid()) and a.is_current
  ));
revoke all on public.konsoliss_containers from anon,authenticated;
revoke all on public.konsoliss_container_assignments from anon,authenticated;
grant select on public.konsoliss_containers to authenticated;
grant select on public.konsoliss_container_assignments to authenticated;

create or replace function public.konsoliss_admin_list_containers()
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.wantiss_admin_staff s
    where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'
  ) then raise exception 'Konsoliss operations require Super Admin' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'container_number',c.container_number,'status',c.status,
      'updated_at',c.updated_at,
      'assigned_customers',(select count(*) from public.konsoliss_container_assignments a where a.container_id=c.id and a.is_current)
    ) order by c.updated_at desc)
    from public.konsoliss_containers c
  ),'[]'::jsonb);
end $$;
revoke all on function public.konsoliss_admin_list_containers() from public,anon;
grant execute on function public.konsoliss_admin_list_containers() to authenticated;

create or replace function public.konsoliss_admin_manage_container(
  p_action text,p_container_id uuid default null,p_container_number text default null,
  p_status text default null,p_customer_id uuid default null,p_reason text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid;v_before jsonb;v_after jsonb;v_previous_status text;v_next text;
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.wantiss_admin_staff s
    where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'
  ) then raise exception 'Konsoliss operations require Super Admin' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500
    then raise exception 'An audit reason of 5-500 characters is required' using errcode='22023'; end if;

  if p_action='create' then
    if p_container_number is null or upper(trim(p_container_number)) !~ '^[A-Z0-9-]{3,40}$'
      then raise exception 'Invalid container identifier' using errcode='22023';end if;
    insert into public.konsoliss_containers(container_number,status)
      values(upper(trim(p_container_number)),'filling') returning id into v_id;
  elsif p_action='advance' then
    if p_container_id is null then raise exception 'Container ID required' using errcode='22023';end if;
    select to_jsonb(c),c.status into v_before,v_previous_status
      from public.konsoliss_containers c where c.id=p_container_id for update;
    if v_before is null then raise exception 'Container not found' using errcode='P0002';end if;
    v_next=case v_previous_status
      when 'filling' then 'filled'
      when 'filled' then 'departed'
      when 'departed' then 'arrived'
      else null end;
    if v_next is null or p_status is distinct from v_next
      then raise exception 'Invalid lifecycle transition' using errcode='22023';end if;
    update public.konsoliss_containers set status=v_next,updated_at=now() where id=p_container_id;
    v_id=p_container_id;
  elsif p_action='assign' then
    if p_container_id is null or p_customer_id is null
      then raise exception 'Container and customer IDs required' using errcode='22023';end if;
    if not exists(select 1 from public.konsoliss_containers where id=p_container_id)
      then raise exception 'Container not found' using errcode='P0002';end if;
    perform 1 from auth.users where id=p_customer_id for update;
    if not found then raise exception 'Customer not found' using errcode='P0002';end if;
    select to_jsonb(a) into v_before from public.konsoliss_container_assignments a
      where a.user_id=p_customer_id and a.is_current;
    update public.konsoliss_container_assignments set is_current=false
      where user_id=p_customer_id and is_current;
    insert into public.konsoliss_container_assignments(container_id,user_id,is_current)
      values(p_container_id,p_customer_id,true)
      on conflict(container_id,user_id) do update set is_current=true,assigned_at=now();
    v_id=p_container_id;
  else raise exception 'Unsupported container action' using errcode='22023';end if;
  select to_jsonb(c) into v_after from public.konsoliss_containers c where c.id=v_id;
  insert into public.wantiss_admin_audit_log
    (actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values((select auth.uid()),'konsoliss.container.'||p_action,'konsoliss_container',
    v_id::text,trim(p_reason),v_before,
    v_after || case when p_action='assign'
    then jsonb_build_object('assigned_customer_id',p_customer_id) else '{}'::jsonb end);
  return v_after;
end $$;
revoke all on function public.konsoliss_admin_manage_container(text,uuid,text,text,uuid,text)
  from public,anon;
grant execute on function public.konsoliss_admin_manage_container(text,uuid,text,text,uuid,text)
  to authenticated;
