-- Preserve owner scope and verified occupancy; three decimals prevent premature 100% or false 0%.
create or replace function public.konsoliss_container_occupancy(p_container_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_capacity numeric;v_type text;v_members bigint;v_verified bigint;
 v_loaded numeric;v_allocated numeric;v_my_loaded numeric;v_my_allocated numeric;
begin
 if v_actor is null or p_container_id is null then return null;end if;
 if not exists(select 1 from public.konsoliss_container_assignments where container_id=p_container_id and user_id=v_actor and is_current) then return null;end if;
 select capacity_cbm,container_type into v_capacity,v_type from public.konsoliss_containers where id=p_container_id;
 if v_capacity is distinct from 68 or v_type is distinct from '40HQ' then return null;end if;
 select count(*),count(*) filter(where loaded_cbm is not null and allocated_cbm is not null
  and loaded_cbm>=0 and loaded_cbm<=allocated_cbm and allocated_cbm<=v_capacity),
  sum(loaded_cbm),sum(allocated_cbm),sum(loaded_cbm) filter(where user_id=v_actor),max(allocated_cbm) filter(where user_id=v_actor)
  into v_members,v_verified,v_loaded,v_allocated,v_my_loaded,v_my_allocated
  from public.konsoliss_container_assignments where container_id=p_container_id and is_current;
 if v_members=0 or v_verified<>v_members or v_loaded is null or v_loaded<0
  or v_allocated>v_capacity or v_loaded>v_allocated or v_my_loaded is null or v_my_allocated is null then return null;end if;
 return jsonb_build_object('container_id',p_container_id,'container_type',v_type,'capacity_cbm',v_capacity,
  'loaded_cbm',v_loaded,'your_space_cbm',v_my_loaded,'your_loaded_cbm',v_my_loaded,'your_allocated_cbm',v_my_allocated,
  'other_cargo_cbm',v_loaded-v_my_loaded,'free_cbm',v_capacity-v_loaded,'fill_percent',round(v_loaded/v_capacity*100,3));
end $$;
revoke all on function public.konsoliss_container_occupancy(uuid) from public,anon;
grant execute on function public.konsoliss_container_occupancy(uuid) to authenticated;
