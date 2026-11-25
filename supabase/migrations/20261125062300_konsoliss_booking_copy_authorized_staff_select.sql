-- Keep Content Studio draft visibility scoped to authenticated authorized staff.
-- The published-only projection RPC remains public; this GRANT alone cannot bypass RLS.
grant select on public.konsoliss_booking_copy to authenticated;
