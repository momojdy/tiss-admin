-- 40HQ physical capacity also bounds the sum of customer allocations.
-- Locking the parent container row in this RPC serializes concurrent verifications.
create or replace function public.konsoliss_admin_set_container_load(
 p_container_id uuid,p_customer_id uuid,p_loaded_cbm numeric,p_allocated_cbm numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_before jsonb;v_after jsonb;v_capacity numeric;v_other numeric;v_other_allocated numeric;
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
 select coalesce(sum(a.allocated_cbm),0) into v_other_allocated
 from public.konsoliss_container_assignments a
 where a.container_id=p_container_id and a.is_current and a.user_id<>p_customer_id;
 if v_other_allocated+p_allocated_cbm>v_capacity then
   raise exception 'Allocated cargo exceeds container capacity' using errcode='22023';end if;
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
