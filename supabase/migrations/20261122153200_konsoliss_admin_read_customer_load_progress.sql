-- Staff can review the existing customer-specific volume breakdown before editing it.
-- Prevents blind overwrites when shipments have already progressed.
create or replace function public.konsoliss_admin_get_customer_load_progress(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.wantiss_admin_staff s
  where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'
 ) then raise exception 'Only active Super Admin may view customer load progress' using errcode='42501'; end if;
 return (select to_jsonb(p) from public.konsoliss_customer_load_progress p where p.user_id=p_user_id);
end $$;
revoke all on function public.konsoliss_admin_get_customer_load_progress(uuid) from public,anon;
grant execute on function public.konsoliss_admin_get_customer_load_progress(uuid) to authenticated;
