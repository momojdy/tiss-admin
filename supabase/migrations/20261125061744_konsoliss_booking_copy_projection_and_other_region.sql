
insert into public.konsoliss_booking_routes(code,country,region,shipping_mode,delivery,price_published)
values('HT-OTHER-LCL-PICKUP','HT','OTHER','LCL','pickup',false)
on conflict(code) do nothing;
revoke select on public.konsoliss_booking_copy from anon,authenticated;
drop policy if exists konsoliss_copy_read on public.konsoliss_booking_copy;
create policy konsoliss_copy_staff on public.konsoliss_booking_copy for select to authenticated
using(coalesce(public.wantiss_has_permission('content.manage','edit'),false));
create or replace function public.konsoliss_public_booking_copy(p_locale text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(c.copy_key,c.published_text),'{}'::jsonb)
 from public.konsoliss_booking_copy c
 where c.published_text is not null and c.locale=case when p_locale in ('en','fr','ht','es','zh-Hans') then p_locale else 'en' end;
$$;
revoke all on function public.konsoliss_public_booking_copy(text) from public;
grant execute on function public.konsoliss_public_booking_copy(text) to anon,authenticated;
grant execute on function public.konsoliss_booking_estimate(text,numeric,numeric) to anon;
