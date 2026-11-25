-- Controlled Konsoliss piece declaration / tracking / warehouse receipt only.
-- These RPCs NEVER charge a card, mark customs cleared, or fake a load. All need real paid entitlements.
create table if not exists public.konsoliss_piece_tracking (
 piece_id uuid primary key references public.konsoliss_consignment_pieces(id),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 customer_id uuid not null references auth.users(id),
 tracking_number text not null check(length(tracking_number) between 6 and 90),
 status text not null default 'submitted' check(status in ('submitted','carrier_accepted','rejected')),
 submitted_at timestamptz not null default now(),
 first_carrier_scan_at timestamptz,
 carrier_evidence text,
 accepted_by uuid,
 check (status <> 'carrier_accepted' or (first_carrier_scan_at is not null and carrier_evidence is not null and accepted_by is not null))
);
create index if not exists konsoliss_piece_tracking_order on public.konsoliss_piece_tracking(order_id,tracking_number);
alter table public.konsoliss_piece_tracking enable row level security;
revoke all on public.konsoliss_piece_tracking from anon,authenticated;
grant select on public.konsoliss_piece_tracking to authenticated;
create policy konsoliss_tracking_owner on public.konsoliss_piece_tracking for select to authenticated
 using(customer_id=(select auth.uid()) or exists(
 select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));

create or replace function public.konsoliss_customer_declare_piece(
 p_order_id uuid,p_piece_reference text,p_description text,p_category text,p_value_usd numeric,p_cbm numeric
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());o public.konsoliss_booking_orders%rowtype;
declare p public.konsoliss_consignment_pieces%rowtype;active numeric;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if length(trim(coalesce(p_piece_reference,''))) not between 4 and 80 or
 length(trim(coalesce(p_description,''))) not between 3 and 400 or
 p_category not in ('unknown','general','electronics','battery','special') or
 p_value_usd is null or p_value_usd<0 or p_value_usd>100000000 or
 p_cbm is null or p_cbm<=0 or p_cbm>68 then
  raise exception 'Valid piece identity, contents, category, value and CBM required' using errcode='22023';end if;
 select * into o from public.konsoliss_booking_orders
 where id=p_order_id and customer_id=actor and status in ('reserved','held','fulfilling')
 and paid_at is not null and verified_payment_reference is not null
 for update;
 if not found then raise exception 'Verified paid booking required before declaring shipping pieces' using errcode='P0002';end if;
 select * into p from public.konsoliss_consignment_pieces
 where order_id=o.id and piece_reference=trim(p_piece_reference);
 if found then
  if p.customer_id<>actor or p.description is distinct from trim(p_description) or
    p.declared_category is distinct from p_category or p.declared_value_usd is distinct from p_value_usd
    or p.declared_cbm is distinct from p_cbm then
   raise exception 'Piece identity already used with different goods' using errcode='23505';end if;
  return jsonb_build_object('id',p.id,'reused',true,'received',p.received_at is not null);
 end if;
 select coalesce(sum(m.delta_cbm),0) into active from public.konsoliss_entitlement_movements m
 join public.konsoliss_entitlement_rights r on r.id=m.right_id
 where r.order_id=o.id;
 if active<=0 then raise exception 'No active paid entitlement in server ledger' using errcode='55000';end if;
 if coalesce((select sum(declared_cbm) from public.konsoliss_consignment_pieces where order_id=o.id),0)+p_cbm>active+0.000001 then
  raise exception 'Declared pieces exceed active paid entitlement; buy additional standalone rights first' using errcode='22023';end if;
 insert into public.konsoliss_consignment_pieces(order_id,customer_id,piece_reference,declared_category,declared_value_usd,declared_cbm)
 values(o.id,actor,trim(p_piece_reference),p_category,p_value_usd,p_cbm) returning * into p;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'piece.declared','consignment_piece',p.id::text,
 jsonb_build_object('order',o.id,'category',p_category,'declared_cbm',p_cbm,'description',trim(p_description)));
 return jsonb_build_object('id',p.id,'reused',false,'received',false,'loaded',false);
end $function$;
-- Add description field as a separate server-owned column so the request's explanation survives.
alter table public.konsoliss_consignment_pieces add column if not exists description text;
create or replace function public.konsoliss_customer_submit_piece_tracking(p_piece_id uuid,p_tracking_number text)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());p public.konsoliss_consignment_pieces%rowtype;
declare t public.konsoliss_piece_tracking%rowtype;
begin
 if actor is null then raise exception 'Sign in required' using errcode='28000';end if;
 if p_tracking_number is null or p_tracking_number !~ '^[A-Za-z0-9._-]{6,90}$' then
  raise exception 'Valid full tracking number required' using errcode='22023';end if;
 select * into p from public.konsoliss_consignment_pieces where id=p_piece_id and customer_id=actor for update;
 if not found then raise exception 'Your parcel not found' using errcode='P0002';end if;
 if p.received_at is not null then raise exception 'Already received; cannot submit new inbound tracking' using errcode='55000';end if;
 if not exists(select 1 from public.konsoliss_booking_orders b where b.id=p.order_id and b.status in ('reserved','held','fulfilling')
 and b.paid_at is not null and b.verified_payment_reference is not null) then
  raise exception 'Paid booking required' using errcode='55000';end if;
 select * into t from public.konsoliss_piece_tracking where piece_id=p.id for update;
 if found then
  if t.tracking_number<>p_tracking_number then raise exception 'Existing tracking locked; request staff review' using errcode='55000';end if;
  return jsonb_build_object('piece_id',p.id,'tracking',t.tracking_number,'status',t.status,'reused',true);
 end if;
 if exists(select 1 from public.konsoliss_piece_tracking where tracking_number=p_tracking_number and order_id<>p.order_id) then
  raise exception 'Tracking already belongs to another booking' using errcode='23505';end if;
 insert into public.konsoliss_piece_tracking(piece_id,order_id,customer_id,tracking_number)
 values(p.id,p.order_id,actor,p_tracking_number) returning * into t;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'piece.tracking_submitted','consignment_piece',p.id::text,jsonb_build_object('order',p.order_id,'tracking',t.tracking_number,'carrier_accepted',false));
 return jsonb_build_object('piece_id',p.id,'tracking',t.tracking_number,'status','submitted','carrier_accepted',false);
end $function$;
create or replace function public.konsoliss_admin_verify_piece_tracking(
 p_piece_id uuid,p_first_scan_at timestamptz,p_evidence text
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());t public.konsoliss_piece_tracking%rowtype;
begin
 if actor is null or not exists(select 1 from public.wantiss_admin_staff s
 where s.user_id=actor and s.status='active' and s.role='super_admin') then raise exception 'Active Super Admin required' using errcode='42501';end if;
 if p_first_scan_at is null or p_first_scan_at>now()+interval '1 minute' or
 length(trim(coalesce(p_evidence,'')))<10 then
  raise exception 'Document real first carrier scan time and evidence' using errcode='22023';end if;
 select * into t from public.konsoliss_piece_tracking where piece_id=p_piece_id for update;
 if not found then raise exception 'Tracking submission not found' using errcode='P0002';end if;
 if t.status='carrier_accepted' then
  if t.first_carrier_scan_at is distinct from p_first_scan_at then raise exception 'Accepted timestamp is immutable' using errcode='55000';end if;
  return jsonb_build_object('piece_id',p_piece_id,'status',t.status,'reused',true);
 end if;
 update public.konsoliss_piece_tracking set status='carrier_accepted',
 first_carrier_scan_at=p_first_scan_at,carrier_evidence=trim(p_evidence),accepted_by=actor
 where piece_id=p_piece_id returning * into t;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'piece.carrier_accepted','consignment_piece',t.piece_id::text,
 jsonb_build_object('first_scan',t.first_carrier_scan_at,'evidence',trim(p_evidence)));
 return jsonb_build_object('piece_id',t.piece_id,'status',t.status,'first_scan',t.first_carrier_scan_at,'warehouse_received',false);
end $function$;
create or replace function public.konsoliss_admin_receive_piece(
 p_piece_id uuid,p_receipt_reference text,p_measured_cbm numeric,p_measured_kg numeric,p_receipt_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());p public.konsoliss_consignment_pieces%rowtype;
declare o public.konsoliss_booking_orders%rowtype;q public.konsoliss_booking_quotes%rowtype;
declare basis text;due_at timestamptz;
begin
 if actor is null or not exists(select 1 from public.wantiss_admin_staff s
 where s.user_id=actor and s.status='active' and s.role='super_admin') then
  raise exception 'Active Super Admin required' using errcode='42501';end if;
 if length(trim(coalesce(p_receipt_reference,'')))<10 or p_measured_cbm is null or p_measured_cbm<=0 or
 p_measured_cbm>68 or p_measured_kg is null or p_measured_kg<=0 or
 p_receipt_at is null or p_receipt_at>now()+interval '1 minute' then
  raise exception 'Real scan receipt reference, measured CBM, gross kg and time required' using errcode='22023';end if;
 select * into p from public.konsoliss_consignment_pieces where id=p_piece_id for update;
 if not found then raise exception 'Piece identity not found' using errcode='P0002';end if;
 if p.received_at is not null then
  if p.receipt_identity=trim(p_receipt_reference) and p.measured_cbm=p_measured_cbm and p.measured_kg=p_measured_kg then
   return jsonb_build_object('piece_id',p.id,'reused',true,'received_at',p.received_at);
  end if;
  raise exception 'Piece already received; cannot scan twice' using errcode='55000';
 end if;
 select * into o from public.konsoliss_booking_orders where id=p.order_id and
 paid_at is not null and verified_payment_reference is not null and status in ('reserved','held','fulfilling') for update;
 if not found then raise exception 'Verified paid booking required' using errcode='55000';end if;
 select * into q from public.konsoliss_booking_quotes where id=o.quote_id;
 update public.konsoliss_consignment_pieces set receipt_identity=trim(p_receipt_reference),
  received_at=p_receipt_at,measured_cbm=p_measured_cbm,measured_kg=p_measured_kg,verified_by=actor
 where id=p.id returning * into p;
 update public.konsoliss_booking_orders set received_cbm=(
   select coalesce(sum(measured_cbm),0) from public.konsoliss_consignment_pieces
   where order_id=o.id and received_at is not null) where id=o.id;
 basis=case when q.country='HT' and q.shipping_mode='LCL' and q.region='PAP' and
   q.delivery='pickup' then 'HT_LCL_RECEIPT_80' else 'NO_BINDING_GUARANTEE' end;
 due_at=case when basis='HT_LCL_RECEIPT_80' then p_receipt_at+interval '80 days' else null end;
 insert into public.konsoliss_lot_delivery_commitments(order_id,piece_id,scope_version,basis,verified_china_receipt_at,original_due_at)
 values(o.id,p.id,coalesce(q.quote_version,1),basis,p_receipt_at,due_at);
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'piece.warehouse_received','consignment_piece',p.id::text,jsonb_build_object(
 'order',o.id,'receipt',trim(p_receipt_reference),'cbm',p_measured_cbm,'kg',p_measured_kg,
 'due_basis',basis,'original_due_at',due_at,'physically_loaded',false));
 return jsonb_build_object('piece_id',p.id,'received',true,'loaded',false,
 'original_due_at',due_at,'due_basis',basis,'customs_cleared',false);
end $function$;
revoke all on function public.konsoliss_customer_declare_piece(uuid,text,text,text,numeric,numeric) from public,anon;
revoke all on function public.konsoliss_customer_submit_piece_tracking(uuid,text) from public,anon;
revoke all on function public.konsoliss_admin_verify_piece_tracking(uuid,timestamptz,text) from public,anon;
revoke all on function public.konsoliss_admin_receive_piece(uuid,text,numeric,numeric,timestamptz) from public,anon;
grant execute on function public.konsoliss_customer_declare_piece(uuid,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.konsoliss_customer_submit_piece_tracking(uuid,text) to authenticated;
grant execute on function public.konsoliss_admin_verify_piece_tracking(uuid,timestamptz,text) to authenticated;
grant execute on function public.konsoliss_admin_receive_piece(uuid,text,numeric,numeric,timestamptz) to authenticated;