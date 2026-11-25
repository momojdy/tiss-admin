-- Konsoliss financial, entitlement and operational foundations. No checkout/payment is enabled here.
-- Tables contain no fabricated shipments. Signed provider capture and human safety/custody proofs are required later.
create table if not exists public.konsoliss_entitlement_rights (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 customer_id uuid not null references auth.users(id),
 source_kind text not null check(source_kind in ('original','standalone','completion')),
 source_reference text not null unique,
 physical_cbm numeric(12,6) not null check(physical_cbm>0),
 allocated_kg numeric(14,4) not null check(allocated_kg>=0),
 acquired_at timestamptz not null,
 tracking_due_at timestamptz not null,
 cancel_until timestamptz not null,
 created_at timestamptz not null default now(),
 check(tracking_due_at>acquired_at and cancel_until>acquired_at)
);
create table if not exists public.konsoliss_entitlement_movements (
 id uuid primary key default gen_random_uuid(),
 right_id uuid not null references public.konsoliss_entitlement_rights(id),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 delta_cbm numeric(12,6) not null check(delta_cbm<>0),
 delta_kg numeric(14,4) not null default 0,
 reason text not null check(reason in ('purchase','standalone','completion','reduction','expired','finalized','restoration','correction')),
 evidence jsonb not null default '{}'::jsonb,
 idempotency_key text not null unique,
 actor_id uuid,
 created_at timestamptz not null default now(),
 check((delta_cbm>0 and reason in ('purchase','standalone','completion','restoration','correction')) or
       (delta_cbm<0 and reason in ('reduction','expired','finalized','correction')))
);
create index if not exists konsoliss_entitlement_movement_by_right on public.konsoliss_entitlement_movements(right_id,created_at);
create table if not exists public.konsoliss_adjustment_versions (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 adjustment_key text not null,
 revision integer not null check(revision>0),
 status text not null default 'proposed' check(status in ('proposed','disputed','accepted','payment_pending','settled','void')),
 freight_cents integer not null default 0 check(freight_cents>=0),
 customs_cents integer not null default 0 check(customs_cents>=0),
 delivery_cents integer not null default 0 check(delivery_cents>=0),
 specialist_cents integer not null default 0 check(specialist_cents>=0),
 credit_cents integer not null default 0 check(credit_cents>=0),
 payable_cents integer generated always as (freight_cents+customs_cents+delivery_cents+specialist_cents-credit_cents) stored,
 scope_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(scope_snapshot)='object'),
 reason text not null,
 authorized_by uuid,
 payment_reference text unique,
 created_at timestamptz not null default now(),
 unique(order_id,adjustment_key,revision),
 check(freight_cents+customs_cents+delivery_cents+specialist_cents>=credit_cents)
);
create table if not exists public.konsoliss_consignment_pieces (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 customer_id uuid not null references auth.users(id),
 parcel_id uuid references public.konsoliss_booking_parcels(id),
 consignment_reference text,
 piece_reference text not null,
 parent_piece_id uuid references public.konsoliss_consignment_pieces(id),
 declared_category text,
 declared_value_usd numeric(14,2) check(declared_value_usd>=0),
 declared_cbm numeric(12,6) not null check(declared_cbm>0),
 measured_cbm numeric(12,6) check(measured_cbm>0),
 measured_kg numeric(14,4) check(measured_kg>0),
 received_at timestamptz,
 receipt_identity text unique,
 verified_by uuid,
 created_at timestamptz not null default now(),
 unique(order_id,piece_reference),
 check(receipt_identity is null or received_at is not null)
);
create index if not exists konsoliss_piece_tracking on public.konsoliss_consignment_pieces(order_id,consignment_reference);
create table if not exists public.konsoliss_cargo_customs_decisions (
 id uuid primary key default gen_random_uuid(),
 piece_id uuid not null references public.konsoliss_consignment_pieces(id),
 decision_version integer not null check(decision_version>0),
 status text not null check(status in ('pending','approved','held','rejected')),
 additional_cents integer check(additional_cents>=0),
 document_reference text,
 notes text,
 reviewer_id uuid,
 decided_at timestamptz not null default now(),
 unique(piece_id,decision_version),
 check(status<>'approved' or (reviewer_id is not null and document_reference is not null))
);
create table if not exists public.konsoliss_lot_delivery_commitments (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 piece_id uuid not null unique references public.konsoliss_consignment_pieces(id),
 scope_version integer not null check(scope_version>0),
 basis text not null check(basis in ('HT_LCL_RECEIPT_80','CUSTOM_SCOPED','NO_BINDING_GUARANTEE')),
 verified_china_receipt_at timestamptz,
 original_due_at timestamptz,
 revised_due_at timestamptz,
 revision_reason text,
 approved_by uuid,
 created_at timestamptz not null default now(),
 check(original_due_at is null or verified_china_receipt_at is not null),
 check(basis<>'HT_LCL_RECEIPT_80' or
       (verified_china_receipt_at is not null and original_due_at=verified_china_receipt_at+interval '80 days')),
 check(revised_due_at is null or (revision_reason is not null and approved_by is not null))
);
create table if not exists public.konsoliss_partner_fulfillment_cases (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 route_code text not null references public.konsoliss_booking_routes(code),
 mode text not null check(mode in ('OWN_40HQ','PARTNER_LCL','PARTNER_FCL','TRANSLOAD_HUB')),
 status text not null default 'planning' check(status in ('planning','quotation_requested','quoted','approved','accepted_by_carrier','custody_transferred','departed','arrived','closed','incident')),
 partner_name text,
 quote_reference text,
 partner_cost_cents integer check(partner_cost_cents>=0),
 quoted_lead_days integer check(quoted_lead_days>=0),
 quote_verified boolean not null default false,
 actual_acceptance_at timestamptz,
 custody_evidence text,
 delivery_due_at timestamptz,
 risk_review jsonb not null default '{}'::jsonb,
 approved_by uuid,
 created_at timestamptz not null default now(),
 check(status not in ('accepted_by_carrier','custody_transferred','departed','arrived','closed') or
       (quote_verified and approved_by is not null)),
 check(status not in ('custody_transferred','departed','arrived','closed') or
       (actual_acceptance_at is not null and custody_evidence is not null))
);
create table if not exists public.konsoliss_customer_service_requests (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 customer_id uuid not null references auth.users(id),
 request_kind text not null check(request_kind in ('refund','return','alternative_service','claim')),
 idempotency_key uuid not null,
 description text not null check(length(trim(description)) between 10 and 2000),
 status text not null default 'submitted' check(status in
 ('submitted','in_review','needs_information','rejected','approved_pending_manual_settlement','resolved')),
 reviewer_id uuid,
 decision_note text,
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 unique(customer_id,idempotency_key)
);
create index if not exists konsoliss_customer_requests_by_order on public.konsoliss_customer_service_requests(order_id,created_at desc);
-- All new operational tables are deny-write by default. No browser/user may invent money or receipts.
do $$
declare tab text;
begin
 foreach tab in array array[
 'konsoliss_entitlement_rights','konsoliss_entitlement_movements',
 'konsoliss_adjustment_versions','konsoliss_consignment_pieces',
 'konsoliss_cargo_customs_decisions','konsoliss_lot_delivery_commitments',
 'konsoliss_partner_fulfillment_cases','konsoliss_customer_service_requests'
 ] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
 end loop;
end $$;
grant select on public.konsoliss_entitlement_rights, public.konsoliss_entitlement_movements,
 public.konsoliss_adjustment_versions, public.konsoliss_consignment_pieces,
 public.konsoliss_cargo_customs_decisions, public.konsoliss_lot_delivery_commitments,
 public.konsoliss_partner_fulfillment_cases, public.konsoliss_customer_service_requests to authenticated;
create policy konsoliss_rights_owner on public.konsoliss_entitlement_rights for select to authenticated
 using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_moves_owner on public.konsoliss_entitlement_movements for select to authenticated
 using(exists(select 1 from public.konsoliss_entitlement_rights r where r.id=right_id and
 (r.customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'))));
create policy konsoliss_adj_versions_owner on public.konsoliss_adjustment_versions for select to authenticated
 using(exists(select 1 from public.konsoliss_booking_orders b where b.id=order_id and
 (b.customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'))));
create policy konsoliss_pieces_owner on public.konsoliss_consignment_pieces for select to authenticated
 using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_customs_owner on public.konsoliss_cargo_customs_decisions for select to authenticated
 using(exists(select 1 from public.konsoliss_consignment_pieces p where p.id=piece_id and
 (p.customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'))));
create policy konsoliss_due_owner on public.konsoliss_lot_delivery_commitments for select to authenticated
 using(exists(select 1 from public.konsoliss_booking_orders b where b.id=order_id and
 (b.customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'))));
create policy konsoliss_partner_admin_only on public.konsoliss_partner_fulfillment_cases for select to authenticated
 using(exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_requests_owner on public.konsoliss_customer_service_requests for select to authenticated
 using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create or replace function public.konsoliss_customer_request_service(p_order_id uuid,p_kind text,p_reason text,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());req public.konsoliss_customer_service_requests%rowtype;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_key is null or p_kind not in ('refund','return','alternative_service','claim') or
    length(trim(coalesce(p_reason,''))) not between 10 and 2000 then
  raise exception 'Valid request, description and idempotency key required' using errcode='22023';end if;
 if not exists(select 1 from public.konsoliss_booking_orders where id=p_order_id and customer_id=actor
  and status in ('reserved','held','fulfilling','ready')) then
  raise exception 'Eligible paid booking not found' using errcode='P0002';end if;
 insert into public.konsoliss_customer_service_requests(order_id,customer_id,request_kind,idempotency_key,description)
 values(p_order_id,actor,p_kind,p_key,trim(p_reason))
 on conflict(customer_id,idempotency_key) do nothing;
 select * into req from public.konsoliss_customer_service_requests where customer_id=actor and idempotency_key=p_key;
 if req.order_id<>p_order_id or req.request_kind<>p_kind then raise exception 'Idempotency key reused with different request' using errcode='22023';end if;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'request.submitted','service_request',req.id::text,jsonb_build_object('order_id',p_order_id,'kind',p_kind))
 on conflict do nothing;
 return jsonb_build_object('id',req.id,'status',req.status,'payment_or_refund_initiated',false);
end $function$;
revoke all on function public.konsoliss_customer_request_service(uuid,text,text,uuid) from public,anon;
grant execute on function public.konsoliss_customer_request_service(uuid,text,text,uuid) to authenticated;
-- Immutable movement/price/receipt records: corrections must be new recorded events.
create or replace function public.konsoliss_immutable_record_guard()
returns trigger language plpgsql set search_path='' as $function$
begin
 raise exception 'This financial, entitlement or custody record is immutable. Append a correction.' using errcode='55000';
end $function$;
revoke all on function public.konsoliss_immutable_record_guard() from public,anon,authenticated;
create trigger konsoliss_movement_immutable before update or delete on public.konsoliss_entitlement_movements
 for each row execute function public.konsoliss_immutable_record_guard();
create trigger konsoliss_adjustment_immutable before update or delete on public.konsoliss_adjustment_versions
 for each row execute function public.konsoliss_immutable_record_guard();
-- Financial versions are proposal snapshots, not live payment instructions; payment integration remains deliberately disabled.
