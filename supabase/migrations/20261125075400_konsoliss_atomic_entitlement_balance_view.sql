-- Transactional per-right invariant: immutable events can never over-release or mint more than paid right.
create or replace function public.konsoliss_entitlement_movement_balance_guard()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare r public.konsoliss_entitlement_rights%rowtype;prior numeric;
begin
 select * into r from public.konsoliss_entitlement_rights where id=new.right_id for update;
 if not found or r.order_id<>new.order_id then
  raise exception 'Entitlement movement must belong to its purchased right and booking' using errcode='23503';end if;
 select coalesce(sum(delta_cbm),0) into prior from public.konsoliss_entitlement_movements where right_id=new.right_id;
 if prior+new.delta_cbm < -0.0000001 or prior+new.delta_cbm>r.physical_cbm+0.0000001 then
  raise exception 'Cannot release more space than held or exceed paid acquired CBM on this right' using errcode='23514';end if;
 if new.reason in ('purchase','standalone','completion') and new.delta_cbm<>r.physical_cbm then
  raise exception 'Original acquisition must match exactly the paid right' using errcode='23514';end if;
 if new.reason in ('purchase','standalone','completion') and prior<>0 then
  raise exception 'Acquisition cannot be repeated for the same right' using errcode='23505';end if;
 return new;
end $fn$;
revoke all on function public.konsoliss_entitlement_movement_balance_guard() from public,anon,authenticated;
create trigger konsoliss_entitlement_balance_guard before insert on public.konsoliss_entitlement_movements
 for each row execute function public.konsoliss_entitlement_movement_balance_guard();
create or replace view public.konsoliss_rights_balance with (security_invoker=true) as
select r.id as right_id,r.order_id,r.customer_id,r.source_kind,r.source_reference,
 r.physical_cbm as purchased_cbm,r.allocated_kg,r.acquired_at,r.tracking_due_at,r.cancel_until,
 coalesce(sum(m.delta_cbm),0)::numeric(12,6) as active_cbm,
 coalesce(sum(case when m.delta_cbm<0 then -m.delta_cbm else 0 end),0)::numeric(12,6) as total_released_cbm
from public.konsoliss_entitlement_rights r
left join public.konsoliss_entitlement_movements m on m.right_id=r.id
group by r.id;
revoke all on public.konsoliss_rights_balance from anon,authenticated;
grant select on public.konsoliss_rights_balance to authenticated;
