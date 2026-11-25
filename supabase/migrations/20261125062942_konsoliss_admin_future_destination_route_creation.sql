-- Founder requirement: future destination countries and service areas originate in Admin.
-- New routes are quotation-only, not verified carrier service or paid checkout.
alter table public.konsoliss_booking_routes drop constraint if exists konsoliss_booking_routes_country_check;
alter table public.konsoliss_booking_routes add constraint konsoliss_booking_routes_country_check
 check(country ~ '^[A-Z]{2}$');
create or replace function public.konsoliss_admin_add_booking_route(
 p_country text,p_region text,p_mode text,p_delivery text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());route_code text;
begin
 if actor is null or not exists(select 1 from public.wantiss_admin_staff
  where user_id=actor and status='active' and role='super_admin') then
  raise exception 'Active Super Admin required' using errcode='42501';end if;
 if p_country is null or p_country !~ '^[A-Z]{2}$'
 or p_region is null or p_region !~ '^[A-Z0-9_-]{2,40}$'
 or p_mode not in ('LCL','FCL') or p_delivery not in ('pickup','door')
 or length(trim(coalesce(p_reason,''))) not between 5 and 500 then
  raise exception 'Valid ISO country, region, mode, delivery and reason required' using errcode='22023';end if;
 route_code=p_country||'-'||p_region||'-'||p_mode||'-'||upper(p_delivery);
 if length(route_code)>80 then raise exception 'Route code too long' using errcode='22023';end if;
 insert into public.konsoliss_booking_routes(code,country,region,shipping_mode,delivery,requests_enabled,service_verified,checkout_enabled,price_published,rate_points)
 values(route_code,p_country,p_region,p_mode,p_delivery,false,false,false,false,null);
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'route.created','route',route_code,jsonb_build_object('reason',p_reason,'requests_enabled',false,'checkout_enabled',false));
 return jsonb_build_object('code',route_code,'requests_enabled',false,'checkout_enabled',false);
end $$;
revoke all on function public.konsoliss_admin_add_booking_route(text,text,text,text,text) from public,anon;
grant execute on function public.konsoliss_admin_add_booking_route(text,text,text,text,text) to authenticated;
