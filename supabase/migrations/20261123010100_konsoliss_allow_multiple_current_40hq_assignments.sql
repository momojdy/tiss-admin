-- Preserve all separate current 40HQ container assignments for a customer.
-- The original assign action deactivated every other container, which prevented
-- split shipments from being represented accurately.
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
      where a.user_id=p_customer_id and a.container_id=p_container_id;
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
revoke all on function public.konsoliss_admin_manage_container(text,uuid,text,text,uuid,text) from public,anon;
grant execute on function public.konsoliss_admin_manage_container(text,uuid,text,text,uuid,text) to authenticated;
