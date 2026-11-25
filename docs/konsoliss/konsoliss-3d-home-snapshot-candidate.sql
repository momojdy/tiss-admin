-- Candidate: authoritative, owner-scoped 3D homepage read and admin reconciliation.
-- No purchase, expiry, payment, carrier evidence, receipt or cargo event is created here.
-- Actual physical allocation remains a separately authorized measured operation.
create or replace function private.konsoliss_home_facts(p_customer uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 v_reserved numeric:=0;v_sent numeric:=0;v_received numeric:=0;v_loaded numeric:=0;v_allocated numeric:=0;
 v_transit numeric:=0;v_covered numeric:=0;v_due timestamptz;v_paid_count bigint;v_unknown bigint;v_members bigint;
 v_invalid boolean;v_label boolean;v_expired boolean;v_ambiguous boolean;v_incident boolean;v_prepare boolean;
 v_kind text;v_status text;v_r numeric;v_s numeric;
begin
 -- A quote or a submitted tracking label alone creates neither space nor sent cargo.
 with paid as (
  select o.id from public.konsoliss_booking_orders o
  where o.customer_id=p_customer and o.status in ('reserved','held','fulfilling','ready')
    and o.paid_at is not null and length(trim(coalesce(o.verified_payment_reference,'')))>0
 ), rights as (
  select r.order_id,count(*) n,count(*) filter(where r.active_cbm>0) positive,
    sum(r.active_cbm) active,min(r.tracking_due_at) filter(where r.active_cbm>0) deadline,
    bool_or(r.active_cbm<0 or r.active_cbm>r.purchased_cbm or r.active_cbm is null or r.active_cbm>='Infinity'::numeric) invalid
  from public.konsoliss_rights_balance r join paid o on o.id=r.order_id
  where r.customer_id=p_customer group by r.order_id
 ), evidence as (
  select p.order_id,p.declared_cbm,p.measured_cbm,
   p.received_at is not null and p.receipt_identity is not null and p.verified_by is not null
    and p.measured_cbm>0 and p.measured_cbm<'Infinity'::numeric and p.measured_kg>0 and p.measured_kg<'Infinity'::numeric as received,
   t.status='carrier_accepted' and t.first_carrier_scan_at is not null and t.carrier_evidence is not null and t.accepted_by is not null as dispatched,
   t.status='submitted' as label,
   (p.parent_piece_id is not null or p.declared_cbm<=0 or p.declared_cbm>='Infinity'::numeric
    or (p.received_at is not null and (p.receipt_identity is null or p.verified_by is null or p.measured_cbm is null or p.measured_kg is null
       or p.measured_cbm<=0 or p.measured_cbm>='Infinity'::numeric or p.measured_kg<=0 or p.measured_kg>='Infinity'::numeric))) as invalid
  from public.konsoliss_consignment_pieces p join paid o on o.id=p.order_id
  left join public.konsoliss_piece_carrier_records t on t.piece_id=p.id and t.order_id=p.order_id and t.customer_id=p.customer_id
  where p.customer_id=p_customer
 ), cargo as (
  select order_id,sum(case when received then measured_cbm when dispatched then declared_cbm else 0 end) sent,
    sum(case when received then measured_cbm else 0 end) received,
    sum(case when not received and dispatched then declared_cbm else 0 end) transit,
    sum(case when received or dispatched then declared_cbm else 0 end) covered,
    bool_or(label) label,bool_or(invalid) invalid
  from evidence group by order_id
 )
 select count(*),coalesce(sum(r.active),0),coalesce(sum(c.sent),0),coalesce(sum(c.received),0),
  coalesce(sum(c.transit),0),coalesce(sum(c.covered),0),
  coalesce(bool_or(r.n is null or r.invalid or coalesce(c.invalid,false) or (r.active=0 and coalesce(c.sent,0)>0)),false),
  coalesce(bool_or(c.label and r.active>0),false),
  min(r.deadline) filter(where r.n=1 and r.positive=1 and coalesce(c.covered,0)<r.active),
  coalesce(bool_or(r.n>1 and coalesce(c.covered,0)<r.active),false)
 into v_paid_count,v_reserved,v_sent,v_received,v_transit,v_covered,v_invalid,v_label,v_due,v_ambiguous
 from paid o left join rights r on r.order_id=o.id left join cargo c on c.order_id=o.id;

 select count(*),count(*) filter(where a.loaded_cbm is null or a.allocated_cbm is null),
  coalesce(sum(a.loaded_cbm) filter(where a.loaded_cbm is not null and a.allocated_cbm is not null),0),
  coalesce(sum(a.allocated_cbm) filter(where a.loaded_cbm is not null and a.allocated_cbm is not null),0)
 into v_members,v_unknown,v_loaded,v_allocated
 from public.konsoliss_container_assignments a where a.user_id=p_customer and a.is_current;

 select exists(select 1 from public.konsoliss_entitlement_movements m
  join public.konsoliss_entitlement_rights r on r.id=m.right_id and r.order_id=m.order_id
  join public.konsoliss_booking_orders o on o.id=r.order_id and o.customer_id=r.customer_id
  where r.customer_id=p_customer and m.reason='expired' and m.delta_cbm<0 and o.paid_at is not null
    and length(trim(coalesce(o.verified_payment_reference,'')))>0)
 into v_expired;
 -- Operational fulfillment identities and costs are NEVER returned to the customer.
 select exists(select 1 from public.konsoliss_partner_fulfillment_cases f join public.konsoliss_booking_orders o on o.id=f.order_id
   where o.customer_id=p_customer and o.paid_at is not null and o.verified_payment_reference is not null
   and o.status in ('reserved','held','fulfilling','ready') and f.status='incident'),
  exists(select 1 from public.konsoliss_partner_fulfillment_cases f join public.konsoliss_booking_orders o on o.id=f.order_id
   where o.customer_id=p_customer and o.paid_at is not null and o.verified_payment_reference is not null
   and o.status in ('reserved','held','fulfilling','ready') and f.status in ('accepted_by_carrier','custody_transferred')
   and f.quote_verified and f.approved_by is not null)
 into v_incident,v_prepare;

 -- Explicit exact CBM limits precede rounding for the existing three-decimal read model.
 if v_invalid or v_reserved<0 or v_reserved>9999999.999 or v_sent<0 or v_sent>9999999.999
    or v_loaded<0 or v_allocated<v_loaded or v_allocated>v_reserved or v_allocated>v_sent
    or v_allocated>v_received or (v_reserved=0 and v_members>0) then
  return jsonb_build_object('kind','unavailable');
 end if;
 if v_paid_count=0 and not v_expired then return jsonb_build_object('kind','unrecorded');end if;
 if v_reserved=0 and v_sent=0 and v_members=0 and not v_expired then return jsonb_build_object('kind','unrecorded');end if;
 v_kind:='recorded';v_r:=round(v_reserved,3);v_s:=round(v_sent,3);
 if v_reserved>0 and v_r=0 then return jsonb_build_object('kind','unavailable');end if;
 v_status:=case
  when v_incident then 'incident_review'
  when v_reserved=0 and v_sent=0 and v_expired then 'expired'
  when v_prepare and v_loaded=0 then 'preparing'
  when v_allocated>0 then null
  when v_received>0 and v_transit>0 then 'warehouse_and_transit'
  when v_received>0 then 'warehouse'
  when v_transit>0 then 'inbound_warehouse'
  when v_label then 'label_created'
  when v_reserved>0 then 'nothing_sent'
  else null end;
 return jsonb_build_object('kind',v_kind,'status_code',v_status,
  'tracking_due_at',case when not v_ambiguous then v_due else null end,
  'unknown_measurements',v_unknown,
  'reserved_exact',v_reserved,'sent_exact',v_sent,'received_exact',v_received,
  'progress',jsonb_build_object('reserved_cbm',v_r,'sent_cbm',v_s,'loaded_cbm',v_loaded,
   'inbound_to_container_cbm',v_allocated-v_loaded,'allocated_cbm',v_allocated,
   'at_warehouse_or_in_transit_cbm',greatest(0,v_s-v_allocated),
   'reserved_not_sent_cbm',greatest(0,v_r-v_s),'not_allocated_cbm',greatest(0,v_r-v_allocated),
   'allocated_percent',case when v_r>0 then round(v_allocated/v_r*100,2) else 0 end),
  'warehouse_cbm',round(v_received,3),'transit_cbm',round(v_transit,3));
end $$;
revoke all on function private.konsoliss_home_facts(uuid) from public,anon,authenticated;

-- All headline facts, selected-container candidates and shared occupancy use ONE database snapshot.
create or replace function public.konsoliss_homepage_snapshot()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_customer uuid:=(select auth.uid());v_facts jsonb;v_containers jsonb;
begin
 if v_customer is null then return jsonb_build_object('kind','unavailable','containers','[]'::jsonb);end if;
 v_facts:=private.konsoliss_home_facts(v_customer);
 if v_facts->>'kind'='unrecorded' and (exists(select 1 from public.konsoliss_container_assignments where user_id=v_customer and is_current)
   or exists(select 1 from public.konsoliss_customer_load_progress where user_id=v_customer and (reserved_cbm>0 or sent_cbm>0 or loaded_cbm>0 or inbound_to_container_cbm>0))) then
  v_facts:=jsonb_build_object('kind','unavailable');
 end if;
 if v_facts->>'kind'='recorded' and (v_facts->>'unknown_measurements')::bigint>0 then
  -- A new assignment is not a verified zero-load measurement.
  v_facts:=jsonb_build_object('kind','unavailable');
 end if;
 if v_facts->>'kind'='unavailable' then return jsonb_build_object('kind','unavailable','containers','[]'::jsonb);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'number',c.container_number,'status',c.status,
  'occupancy',public.konsoliss_container_occupancy(c.id)) order by a.assigned_at desc,a.id desc),'[]'::jsonb)
 into v_containers from public.konsoliss_container_assignments a
 join public.konsoliss_containers c on c.id=a.container_id where a.user_id=v_customer and a.is_current;
 -- Return only the whitelist. No customer/booking IDs, provider names, costs, evidence or private notes.
 return jsonb_build_object('kind',v_facts->>'kind','progress',v_facts->'progress',
  'status_code',v_facts->'status_code','tracking_due_at',v_facts->'tracking_due_at',
  'warehouse_cbm',v_facts->'warehouse_cbm','transit_cbm',v_facts->'transit_cbm','containers',v_containers);
end $$;
revoke all on function public.konsoliss_homepage_snapshot() from public,anon;
grant execute on function public.konsoliss_homepage_snapshot() to authenticated;

-- Admin's existing measurement screen reconciles the cached progress row from the same facts.
-- Never mint rights, manually claim dispatched volume, or invent receipt/physical cargo.
create or replace function public.konsoliss_admin_reconcile_home_progress(p_customer_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=(select auth.uid());v_facts jsonb;v_p jsonb;v_before jsonb;v_after jsonb;
begin
 if v_actor is null or not exists(select 1 from public.wantiss_admin_staff where user_id=v_actor and role='super_admin' and status='active') then
  raise exception 'Active Super Admin required' using errcode='42501';end if;
 perform 1 from auth.users where id=p_customer_id for update;
 if not found then raise exception 'Customer not found' using errcode='P0002';end if;
 perform 1 from public.konsoliss_containers c where exists(select 1 from public.konsoliss_container_assignments a where a.container_id=c.id and a.user_id=p_customer_id and a.is_current) order by c.id for update;
 v_facts:=private.konsoliss_home_facts(p_customer_id);
 if v_facts->>'kind'='unavailable' then raise exception 'Verified paid rights, custody or measurements require reconciliation' using errcode='55000';end if;
 select to_jsonb(p) into v_before from public.konsoliss_customer_load_progress p where user_id=p_customer_id for update;
 if v_facts->>'kind'='unrecorded' then
  if v_before is not null and ((v_before->>'reserved_cbm')::numeric>0 or (v_before->>'sent_cbm')::numeric>0 or (v_before->>'loaded_cbm')::numeric>0 or (v_before->>'inbound_to_container_cbm')::numeric>0) then
   raise exception 'Legacy manual progress requires verified source records' using errcode='55000';end if;
  return null;
 end if;
 v_p:=v_facts->'progress';
 insert into public.konsoliss_customer_load_progress(user_id,reserved_cbm,sent_cbm,loaded_cbm,inbound_to_container_cbm)
 values(p_customer_id,(v_p->>'reserved_cbm')::numeric,(v_p->>'sent_cbm')::numeric,(v_p->>'loaded_cbm')::numeric,(v_p->>'inbound_to_container_cbm')::numeric)
 on conflict(user_id) do update set reserved_cbm=excluded.reserved_cbm,sent_cbm=excluded.sent_cbm,loaded_cbm=excluded.loaded_cbm,
  inbound_to_container_cbm=excluded.inbound_to_container_cbm,updated_at=clock_timestamp()
 where (konsoliss_customer_load_progress.reserved_cbm,konsoliss_customer_load_progress.sent_cbm,konsoliss_customer_load_progress.loaded_cbm,konsoliss_customer_load_progress.inbound_to_container_cbm)
 is distinct from (excluded.reserved_cbm,excluded.sent_cbm,excluded.loaded_cbm,excluded.inbound_to_container_cbm);
 select to_jsonb(p) into v_after from public.konsoliss_customer_load_progress p where user_id=p_customer_id;
 if v_before is distinct from v_after then
  insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
  values(v_actor,'konsoliss.customer_load.reconcile','konsoliss_customer_load',p_customer_id::text,'Verified paid rights and cargo evidence reconciliation',v_before,v_after);
 end if;
 return v_after;
end $$;
revoke all on function public.konsoliss_admin_reconcile_home_progress(uuid) from public,anon;
grant execute on function public.konsoliss_admin_reconcile_home_progress(uuid) to authenticated;

-- Fail closed on manual or stale progress writes, including the legacy RPC.
-- The admin measurement RPC updates all assignments first, then commits matching totals.
create or replace function private.konsoliss_guard_progress_source()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_facts jsonb;v_p jsonb;
begin
 v_facts:=private.konsoliss_home_facts(new.user_id);v_p:=v_facts->'progress';
 if v_facts->>'kind' is distinct from 'recorded' or
  new.reserved_cbm is distinct from (v_p->>'reserved_cbm')::numeric or
  new.sent_cbm is distinct from (v_p->>'sent_cbm')::numeric or
  new.loaded_cbm is distinct from (v_p->>'loaded_cbm')::numeric or
  new.inbound_to_container_cbm is distinct from (v_p->>'inbound_to_container_cbm')::numeric then
  raise exception 'Customer progress must reconcile to verified paid rights, custody and container measurements' using errcode='55000';
 end if;
 return new;
end $$;
revoke all on function private.konsoliss_guard_progress_source() from public,anon,authenticated;
drop trigger if exists konsoliss_progress_verified_source on public.konsoliss_customer_load_progress;
create trigger konsoliss_progress_verified_source before insert or update on public.konsoliss_customer_load_progress
for each row execute function private.konsoliss_guard_progress_source();
