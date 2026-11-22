-- Customer-facing aggregate only: no other customer identities or shipment rows are exposed.
-- Incomplete measurement coverage returns no totals rather than invented occupancy.
create or replace function public.konsoliss_current_container_occupancy()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_container uuid;v_member_count bigint;v_measured_count bigint;v_own numeric;v_loaded numeric;
begin
 if (select auth.uid()) is null then return null; end if;
 select a.container_id into v_container
 from public.konsoliss_container_assignments a
 where a.user_id=(select auth.uid()) and a.is_current limit 1;
 if v_container is null then return null; end if;
 select count(*),count(p.user_id),coalesce(sum(p.loaded_cbm),0),
        coalesce(sum(p.loaded_cbm) filter(where a.user_id=(select auth.uid())),0)
 into v_member_count,v_measured_count,v_loaded,v_own
 from public.konsoliss_container_assignments a
 left join public.konsoliss_customer_load_progress p on p.user_id=a.user_id
 where a.container_id=v_container and a.is_current;
 if v_member_count=0 or v_member_count<>v_measured_count
    or v_loaded<0 or v_loaded>68 then return null; end if;
 return jsonb_build_object('capacity_cbm',68,
   'loaded_cbm',v_loaded,'your_space_cbm',v_own,
   'other_cargo_cbm',greatest(0,v_loaded-v_own),
   'free_cbm',greatest(0,68-v_loaded));
end $$;
revoke all on function public.konsoliss_current_container_occupancy() from public,anon;
grant execute on function public.konsoliss_current_container_occupancy() to authenticated;
