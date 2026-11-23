-- Live view definition snapshot, 2026-11-23; evaluated against isolated fixture records only.
create view public.konsoliss_customer_load_breakdown with(security_invoker=true) as
 SELECT user_id,
    reserved_cbm,
    sent_cbm,
    loaded_cbm,
    inbound_to_container_cbm,
    loaded_cbm + inbound_to_container_cbm AS allocated_cbm,
    GREATEST(0::numeric, sent_cbm - loaded_cbm - inbound_to_container_cbm) AS at_warehouse_or_in_transit_cbm,
    GREATEST(0::numeric, reserved_cbm - sent_cbm) AS reserved_not_sent_cbm,
    GREATEST(0::numeric, reserved_cbm - loaded_cbm - inbound_to_container_cbm) AS not_allocated_cbm,
        CASE
            WHEN reserved_cbm > 0::numeric THEN round((loaded_cbm + inbound_to_container_cbm) * 100::numeric / reserved_cbm, 2)
            ELSE 0::numeric
        END AS allocated_percent,
    updated_at
   FROM konsoliss_customer_load_progress;
grant select on public.konsoliss_customer_load_breakdown to authenticated;
revoke all on public.konsoliss_customer_load_breakdown from anon;
