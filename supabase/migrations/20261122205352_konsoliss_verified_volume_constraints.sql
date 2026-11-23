-- No customer rows are changed. Reject invalid measurements at every write boundary.
alter table public.konsoliss_customer_load_progress
 add constraint konsoliss_progress_finite_nonnegative check (
 reserved_cbm >= 0 and reserved_cbm < 'Infinity'::numeric and
 sent_cbm >= 0 and sent_cbm < 'Infinity'::numeric and
 loaded_cbm >= 0 and loaded_cbm < 'Infinity'::numeric and
 inbound_to_container_cbm >= 0 and inbound_to_container_cbm < 'Infinity'::numeric
 );
alter table public.konsoliss_container_assignments
 add constraint konsoliss_assignment_finite check (
 (loaded_cbm is null or (loaded_cbm >= 0 and loaded_cbm < 'Infinity'::numeric)) and
 (allocated_cbm is null or (allocated_cbm >= 0 and allocated_cbm < 'Infinity'::numeric))
 );

-- Guard writes from every privileged path, including service-role direct writes.
-- The container row is the serialization point for shared capacity. Unknown values
-- remain unknown and are never stored as measured zeroes.
create or replace function public.konsoliss_guard_assignment_capacity()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_capacity numeric;v_loaded numeric;v_allocated numeric;
begin
 if TG_OP='UPDATE' and (new.user_id is distinct from old.user_id or new.container_id is distinct from old.container_id) then
  raise exception 'Cargo assignment ownership is immutable' using errcode='23514';
 end if;
 select capacity_cbm into v_capacity from public.konsoliss_containers where id=new.container_id for update;
 if not found then raise exception 'Container not found' using errcode='23503';end if;
 if new.is_current then
  select coalesce(sum(loaded_cbm),0),coalesce(sum(allocated_cbm),0) into v_loaded,v_allocated
   from public.konsoliss_container_assignments where container_id=new.container_id and is_current and id<>new.id;
  if v_loaded+coalesce(new.loaded_cbm,0)>v_capacity or v_allocated+coalesce(new.allocated_cbm,0)>v_capacity then
   raise exception 'Cargo exceeds shared container capacity' using errcode='23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.konsoliss_guard_assignment_capacity() from public,anon,authenticated;
create trigger konsoliss_assignment_capacity before insert or update on public.konsoliss_container_assignments
 for each row execute function public.konsoliss_guard_assignment_capacity();
