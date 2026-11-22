-- Applied to live project ycbirmgppwavorwudlrv on 2026-11-23.
-- Canonical type: 40HQ, usable capacity: 68 CBM.
-- Per-customer measurements are nullable until verified.
-- If more than one current assignment exists, legacy global totals are NOT divided or duplicated.
alter table public.konsoliss_containers add column if not exists container_type text not null default '40HQ';
alter table public.konsoliss_containers add column if not exists capacity_cbm numeric(8,3) not null default 68;
alter table public.konsoliss_containers add constraint konsoliss_40hq_capacity_only
 check(container_type='40HQ' and capacity_cbm=68);
alter table public.konsoliss_container_assignments add column if not exists loaded_cbm numeric(8,3);
alter table public.konsoliss_container_assignments add column if not exists allocated_cbm numeric(8,3);
alter table public.konsoliss_container_assignments
 add constraint konsoliss_assignment_load_bounds check(loaded_cbm is null or loaded_cbm between 0 and 68),
 add constraint konsoliss_assignment_allocated_bounds check(allocated_cbm is null or allocated_cbm between 0 and 68),
 add constraint konsoliss_assignment_loaded_within_allocation check(loaded_cbm is null or allocated_cbm is null or loaded_cbm<=allocated_cbm);
drop index if exists public.konsoliss_one_current_container_per_user;

create or replace function public.konsoliss_admin_set_container_load(
 p_container_id uuid,p_customer_id uuid,p_loaded_cbm numeric,p_allocated_cbm numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_before jsonb;v_after jsonb;v_capacity numeric;v_other numeric;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.wantiss_admin_staff s
  where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active')
 then raise exception 'Only active Super Admin may verify container load' using errcode='42501';end if;
 if p_container_id is null or p_customer_id is null or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500
 then raise exception 'Container, customer and audit reason (5-500 characters) required' using errcode='22023';end if;
 select c.capacity_cbm into v_capacity from public.konsoliss_containers c
 where c.id=p_container_id for update;
 if v_capacity is null then raise exception 'Container not found' using errcode='P0002';end if;
 if p_loaded_cbm is null or p_allocated_cbm is null or p_loaded_cbm<0 or p_allocated_cbm<0
    or p_loaded_cbm>p_allocated_cbm or p_allocated_cbm>v_capacity
 then raise exception 'Invalid load: 0 <= loaded <= allocated <= capacity' using errcode='22023';end if;
 select to_jsonb(a) into v_before from public.konsoliss_container_assignments a
 where a.container_id=p_container_id and a.user_id=p_customer_id and a.is_current for update;
 if v_before is null then raise exception 'Customer has no active assignment in this container' using errcode='P0002';end if;
 select coalesce(sum(a.loaded_cbm),0) into v_other from public.konsoliss_container_assignments a
 where a.container_id=p_container_id and a.is_current and a.user_id<>p_customer_id;
 if v_other+p_loaded_cbm>v_capacity then raise exception 'Loaded cargo exceeds container capacity' using errcode='22023';end if;
 update public.konsoliss_container_assignments set loaded_cbm=p_loaded_cbm,allocated_cbm=p_allocated_cbm
 where container_id=p_container_id and user_id=p_customer_id and is_current;
 select to_jsonb(a) into v_after from public.konsoliss_container_assignments a
 where a.container_id=p_container_id and a.user_id=p_customer_id and a.is_current;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values ((select auth.uid()),'konsoliss.container_load.verify','konsoliss_container_assignment',
         v_after->>'id',trim(p_reason),v_before,v_after);
 return v_after;
end $$;
revoke all on function public.konsoliss_admin_set_container_load(uuid,uuid,numeric,numeric,text) from public,anon;
grant execute on function public.konsoliss_admin_set_container_load(uuid,uuid,numeric,numeric,text) to authenticated;

create or replace function public.konsoliss_container_occupancy(p_container_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_capacity numeric;v_type text;v_members bigint;v_verified bigint;
 v_loaded numeric;v_my_loaded numeric;v_my_allocated numeric;
begin
 if (select auth.uid()) is null or p_container_id is null then return null;end if;
 if not exists(select 1 from public.konsoliss_container_assignments a
  where a.container_id=p_container_id and a.user_id=(select auth.uid()) and a.is_current)
 then return null;end if;
 select c.capacity_cbm,c.container_type into v_capacity,v_type from public.konsoliss_containers c
 where c.id=p_container_id;
 if v_capacity is null or v_type<>'40HQ' then return null;end if;
 with measured as (
  select a.user_id,
    case when a.loaded_cbm is not null then a.loaded_cbm
    when (select count(*) from public.konsoliss_container_assignments a2
          where a2.user_id=a.user_id and a2.is_current)=1
      then p.loaded_cbm else null end measured_cbm,
    a.allocated_cbm
  from public.konsoliss_container_assignments a
  left join public.konsoliss_customer_load_progress p on p.user_id=a.user_id
  where a.container_id=p_container_id and a.is_current
 )
 select count(*),count(measured_cbm),sum(measured_cbm),
        sum(measured_cbm) filter(where user_id=(select auth.uid())),
        max(allocated_cbm) filter(where user_id=(select auth.uid()))
 into v_members,v_verified,v_loaded,v_my_loaded,v_my_allocated from measured;
 if v_members=0 or v_verified<>v_members or v_loaded is null or v_loaded<0 or v_loaded>v_capacity
    or v_my_loaded is null then return null;end if;
 return jsonb_build_object('container_id',p_container_id,'container_type',v_type,
   'capacity_cbm',v_capacity,'loaded_cbm',v_loaded,'your_space_cbm',v_my_loaded,
   'your_loaded_cbm',v_my_loaded,'your_allocated_cbm',v_my_allocated,
   'other_cargo_cbm',v_loaded-v_my_loaded,'free_cbm',v_capacity-v_loaded,
   'fill_percent',round(v_loaded/v_capacity*100,2));
end $$;
revoke all on function public.konsoliss_container_occupancy(uuid) from public,anon;
grant execute on function public.konsoliss_container_occupancy(uuid) to authenticated;

create or replace function public.konsoliss_current_container_occupancy()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_id uuid;
begin
 if (select auth.uid()) is null then return null;end if;
 select a.container_id into v_id from public.konsoliss_container_assignments a
 where a.user_id=(select auth.uid()) and a.is_current
 order by a.assigned_at desc,a.id desc limit 1;
 return public.konsoliss_container_occupancy(v_id);
end $$;
revoke all on function public.konsoliss_current_container_occupancy() from public,anon;
grant execute on function public.konsoliss_current_container_occupancy() to authenticated;
