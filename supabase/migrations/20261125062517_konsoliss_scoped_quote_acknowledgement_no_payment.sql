-- Secure quote-scope acknowledgement only; NOT a payment, capacity hold, or reservation.
alter table public.konsoliss_booking_quotes drop constraint if exists konsoliss_booking_quotes_status_check;
alter table public.konsoliss_booking_quotes add constraint konsoliss_booking_quotes_status_check
 check (status in ('submitted','in_review','more_info','approved','accepted_awaiting_checkout','declined','expired','cancelled'));

create table if not exists public.konsoliss_booking_quote_acknowledgements (
 id uuid primary key default gen_random_uuid(),
 quote_id uuid not null references public.konsoliss_booking_quotes(id),
 customer_id uuid not null references auth.users(id),
 quote_version integer not null check(quote_version>0),
 amount_cents integer not null check(amount_cents>=0),
 service_scope jsonb not null check(jsonb_typeof(service_scope)='object'),
 acknowledged_at timestamptz not null default now(),
 checkout_status text not null default 'awaiting_secure_checkout'
 check(checkout_status='awaiting_secure_checkout'),
 unique(quote_id,quote_version)
);
alter table public.konsoliss_booking_quote_acknowledgements enable row level security;
revoke all on public.konsoliss_booking_quote_acknowledgements from anon,authenticated;
grant select on public.konsoliss_booking_quote_acknowledgements to authenticated;
create policy konsoliss_acknowledgements_owner on public.konsoliss_booking_quote_acknowledgements
 for select to authenticated using(customer_id=(select auth.uid()) or
 exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'));

create or replace function public.konsoliss_customer_acknowledge_quote(p_quote_id uuid,p_quote_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());q public.konsoliss_booking_quotes%rowtype;a public.konsoliss_booking_quote_acknowledgements%rowtype;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 select * into q from public.konsoliss_booking_quotes where id=p_quote_id and customer_id=actor for update;
 if not found then raise exception 'Quotation not found' using errcode='P0002';end if;
 if q.status='accepted_awaiting_checkout' and q.quote_version=p_quote_version then
  select * into a from public.konsoliss_booking_quote_acknowledgements where quote_id=q.id and quote_version=q.quote_version;
  if found then return jsonb_build_object('id',a.id,'status',q.status,'reused',true,'payment_taken',false);end if;
 end if;
 if q.status<>'approved' or p_quote_version is distinct from q.quote_version or q.expires_at is null or q.expires_at<now() then
  raise exception 'Quote changed, is not approved or has expired. Refresh before acknowledging.' using errcode='40001';
 end if;
 if q.approved_total_cents is null or q.approved_total_cents<0 or
    q.approved_scope is null or jsonb_typeof(q.approved_scope)<>'object' or
    not(q.approved_scope ?& array['services_included','services_excluded','customs_treatment','delivery_commitment','cargo_review','commercial_approval'])
 then raise exception 'Approved service scope is incomplete' using errcode='22023';end if;
 insert into public.konsoliss_booking_quote_acknowledgements(quote_id,customer_id,quote_version,amount_cents,service_scope)
 values(q.id,actor,q.quote_version,q.approved_total_cents,q.approved_scope) returning * into a;
 update public.konsoliss_booking_quotes set status='accepted_awaiting_checkout',updated_at=now() where id=q.id;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'quote.scope_acknowledged','quote',q.id::text,jsonb_build_object('version',q.quote_version,'amount_cents',q.approved_total_cents,'checkout_enabled',false));
 return jsonb_build_object('id',a.id,'status','accepted_awaiting_checkout','amount_cents',a.amount_cents,'payment_taken',false,'space_reserved',false);
end $$;
revoke all on function public.konsoliss_customer_acknowledge_quote(uuid,integer) from public,anon;
grant execute on function public.konsoliss_customer_acknowledge_quote(uuid,integer) to authenticated;

create or replace function public.konsoliss_booking_quote_finalization_guard()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='accepted_awaiting_checkout' and new.status<>old.status then
  raise exception 'Accepted quote is locked until a verified payment and capacity workflow is deployed' using errcode='55000';
 end if;
 return new;
end $$;
revoke all on function public.konsoliss_booking_quote_finalization_guard() from public,anon,authenticated;
create trigger konsoliss_booking_quote_finalization_guard before update on public.konsoliss_booking_quotes
 for each row execute function public.konsoliss_booking_quote_finalization_guard();
