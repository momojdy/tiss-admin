-- Konsoliss booking foundations: no real-money checkout is enabled by this migration.
-- All customer-visible pricing is indicative until an authorized, scoped quotation and verified payment provider exist.
create table if not exists public.konsoliss_booking_routes (
 code text primary key,
 country text not null check (country in ('HT','US','DO')),
 region text not null,
 shipping_mode text not null check (shipping_mode in ('LCL','FCL')),
 delivery text not null check (delivery in ('pickup','door')),
 requests_enabled boolean not null default true,
 service_verified boolean not null default false,
 checkout_enabled boolean not null default false check (checkout_enabled=false),
 price_published boolean not null default false,
 rate_version integer not null default 1,
 rate_points jsonb,
 density_kg_per_cbm numeric(12,4) not null default 412 check (density_kg_per_cbm>0),
 max_purchase_cbm numeric(12,4) not null default 68,
 updated_at timestamptz not null default now(),
 constraint rate_points_only_for_lcl check (rate_points is null or shipping_mode='LCL')
);
insert into public.konsoliss_booking_routes(code,country,region,shipping_mode,delivery,price_published,rate_points)
values
 ('HT-PAP-LCL-PICKUP','HT','PAP','LCL','pickup',true,
 '[{"cbm":0.02,"usd":27},{"cbm":0.1,"usd":99},{"cbm":0.3,"usd":249},{"cbm":0.5,"usd":379},{"cbm":1,"usd":675}]'),
 ('HT-CAP-LCL-PICKUP','HT','CAP','LCL','pickup',false,null),
 ('HT-CAY-LCL-PICKUP','HT','CAY','LCL','pickup',false,null),
 ('US-REQUEST-LCL-PICKUP','US','OTHER','LCL','pickup',false,null),
 ('US-REQUEST-LCL-DOOR','US','OTHER','LCL','door',false,null),
 ('DO-REQUEST-LCL-PICKUP','DO','OTHER','LCL','pickup',false,null),
 ('DO-REQUEST-LCL-DOOR','DO','OTHER','LCL','door',false,null),
 ('HT-REQUEST-FCL-PICKUP','HT','OTHER','FCL','pickup',false,null),
 ('US-REQUEST-FCL-PICKUP','US','OTHER','FCL','pickup',false,null),
 ('US-REQUEST-FCL-DOOR','US','OTHER','FCL','door',false,null),
 ('DO-REQUEST-FCL-PICKUP','DO','OTHER','FCL','pickup',false,null),
 ('DO-REQUEST-FCL-DOOR','DO','OTHER','FCL','door',false,null)
on conflict (code) do nothing;
create table if not exists public.konsoliss_booking_quotes (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id),
 request_key uuid not null,
 route_code text not null references public.konsoliss_booking_routes(code),
 shipping_mode text not null,
 country text not null,
 region text not null,
 delivery text not null,
 address text,
 physical_cbm numeric(12,6),
 estimated_weight_kg numeric(14,4),
 container_count integer,
 goods_category text not null default 'unknown',
 goods_description text,
 declared_value_usd numeric(14,2),
 packages jsonb not null default '[]',
 price_version integer,
 base_freight_cents integer,
 weight_surcharge_cents integer,
 requested_total_cents integer,
 approved_total_cents integer,
 approved_scope jsonb,
 quote_version integer not null default 1,
 status text not null default 'submitted' check(status in ('submitted','in_review','more_info','approved','declined','expired','cancelled')),
 review_note text,
 approved_by uuid references auth.users(id),
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(customer_id,request_key),
 check (physical_cbm is null or (physical_cbm>=0.02 and physical_cbm<=68)),
 check (estimated_weight_kg is null or (estimated_weight_kg>0 and estimated_weight_kg<=80000)),
 check (container_count is null or (container_count between 1 and 100)),
 check (declared_value_usd is null or declared_value_usd>=0)
);
create index if not exists konsoliss_quotes_owner_created on public.konsoliss_booking_quotes(customer_id,created_at desc);
create table if not exists public.konsoliss_booking_orders (
 id uuid primary key default gen_random_uuid(),
 quote_id uuid unique not null references public.konsoliss_booking_quotes(id),
 customer_id uuid not null references auth.users(id),
 status text not null default 'awaiting_verified_payment' check (status in ('awaiting_verified_payment','reserved','cancelled','held','fulfilling','ready','completed')),
 physical_entitlement_cbm numeric(12,6),
 paid_cents integer not null default 0 check(paid_cents>=0),
 received_cbm numeric(12,6) not null default 0,
 loaded_cbm numeric(12,6) not null default 0,
 verified_payment_reference text unique,
 terms_version text not null,
 accepted_scope jsonb not null,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 check(received_cbm>=0 and loaded_cbm>=0 and loaded_cbm<=received_cbm)
);
create table if not exists public.konsoliss_booking_parcels (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 customer_id uuid not null references auth.users(id),
 description text,
 category text,
 declared_value_usd numeric(14,2),
 requested_cbm numeric(12,6) not null check(requested_cbm>0),
 measured_cbm numeric(12,6),
 measured_kg numeric(12,4),
 tracking_number text,
 tracking_status text not null default 'not_submitted' check(tracking_status in ('not_submitted','submitted','carrier_accepted','rejected')),
 carrier_accepted_at timestamptz,
 receipt_at timestamptz,
 status text not null default 'declared' check(status in ('declared','in_transit','received','inspected','held','cleared','allocated','loaded','departed','arrived','customs','ready','delivered','released')),
 created_at timestamptz not null default now()
);
create table if not exists public.konsoliss_booking_financial_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.konsoliss_booking_orders(id),
 category text not null check(category in ('base_freight','weight_freight','extra_space','extension','customs','door_delivery','refund','credit','reconciliation')),
 amount_cents integer not null,
 provider_charge_id text,
 event_key text unique not null,
 source text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.konsoliss_booking_copy (
 locale text not null check(locale in ('en','fr','ht','es','zh-Hans')),
 copy_key text not null check(copy_key ~ '^bookspace\.[a-zA-Z0-9._-]+$'),
 draft_text text,
 published_text text,
 version integer not null default 0,
 reviewed boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(locale,copy_key),
 check(length(coalesce(draft_text,''))<=2000 and length(coalesce(published_text,''))<=2000)
);
create table if not exists public.konsoliss_booking_audit (
 id bigint generated always as identity primary key,
 actor_id uuid,
 operation text not null,
 target_type text not null,
 target_id text not null,
 payload jsonb not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.konsoliss_booking_routes enable row level security;
alter table public.konsoliss_booking_quotes enable row level security;
alter table public.konsoliss_booking_orders enable row level security;
alter table public.konsoliss_booking_parcels enable row level security;
alter table public.konsoliss_booking_financial_events enable row level security;
alter table public.konsoliss_booking_copy enable row level security;
alter table public.konsoliss_booking_audit enable row level security;
revoke all on public.konsoliss_booking_routes,public.konsoliss_booking_quotes,public.konsoliss_booking_orders,public.konsoliss_booking_parcels,public.konsoliss_booking_financial_events,public.konsoliss_booking_copy,public.konsoliss_booking_audit from anon,authenticated;
grant select on public.konsoliss_booking_routes,public.konsoliss_booking_quotes,public.konsoliss_booking_orders,public.konsoliss_booking_parcels,public.konsoliss_booking_financial_events,public.konsoliss_booking_copy to authenticated;
grant select on public.konsoliss_booking_routes,public.konsoliss_booking_copy to anon;
create policy konsoliss_routes_read on public.konsoliss_booking_routes for select using(true);
create policy konsoliss_quotes_owner on public.konsoliss_booking_quotes for select to authenticated using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_orders_owner on public.konsoliss_booking_orders for select to authenticated using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_parcels_owner on public.konsoliss_booking_parcels for select to authenticated using(customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
create policy konsoliss_finance_owner on public.konsoliss_booking_financial_events for select to authenticated using(exists(select 1 from public.konsoliss_booking_orders b where b.id=order_id and (b.customer_id=(select auth.uid()) or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'))));
create policy konsoliss_copy_read on public.konsoliss_booking_copy for select using(published_text is not null or exists(select 1 from public.wantiss_admin_staff s where s.user_id=(select auth.uid()) and s.status='active' and s.role='super_admin'));
-- Anonymous users may see published text only via the projection RPC; direct selects on published rows are harmless.
create or replace function public.konsoliss_booking_config()
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('code',code,'country',country,'region',region,'mode',shipping_mode,'delivery',delivery,'requests_enabled',requests_enabled,'service_verified',service_verified,'checkout_enabled',checkout_enabled,'price_published',price_published,'density',density_kg_per_cbm) order by code),'[]'::jsonb)
 from public.konsoliss_booking_routes where requests_enabled;
$$;
create or replace function public.konsoliss_booking_estimate(p_route_code text,p_cbm numeric,p_weight_kg numeric default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.konsoliss_booking_routes%rowtype; v numeric; a numeric; amt numeric; base numeric; i integer; points jsonb; first_v numeric; first_p numeric; second_v numeric; second_p numeric;
begin
 select * into r from public.konsoliss_booking_routes where code=p_route_code and requests_enabled;
 if not found then return jsonb_build_object('status','unavailable');end if;
 if r.shipping_mode<>'LCL' or not r.price_published or r.rate_points is null then return jsonb_build_object('status','manual');end if;
 if p_cbm is null or p_cbm<0.02 or p_cbm>r.max_purchase_cbm or (p_weight_kg is not null and (p_weight_kg<=0 or p_weight_kg>80000)) then return jsonb_build_object('status','invalid');end if;
 v=greatest(p_cbm,coalesce(p_weight_kg/r.density_kg_per_cbm,0));
 points=r.rate_points;first_v=(points->0->>'cbm')::numeric;first_p=(points->0->>'usd')::numeric;
 if jsonb_array_length(points)<>5 or first_v<>0.02 then return jsonb_build_object('status','manual');end if;
 base=null;amt=null;
 for i in 1..4 loop
   second_v=(points->i->>'cbm')::numeric;second_p=(points->i->>'usd')::numeric;
   if second_v<=first_v or second_p<=first_p then return jsonb_build_object('status','manual');end if;
   if base is null and p_cbm<=second_v then base=first_p+(p_cbm-first_v)*(second_p-first_p)/(second_v-first_v);end if;
   if amt is null and v<=second_v then amt=first_p+(v-first_v)*(second_p-first_p)/(second_v-first_v);end if;
   first_v=second_v;first_p=second_p;
 end loop;
 if base is null then base=675*p_cbm;end if;
 if amt is null then amt=675*v;end if;
 return jsonb_build_object('status','estimate_only','route',r.code,'version',r.rate_version,'cbm',p_cbm,'chargeable_cbm',round(v,6),'base_cents',round(base*100)::integer,'weight_cents',greatest(0,round(amt*100)::integer-round(base*100)::integer),'total_cents',round(amt*100)::integer,'checkout_enabled',false);
end $$;
create or replace function public.konsoliss_booking_request(p_key uuid,p_route text,p_cbm numeric,p_weight numeric,p_containers integer,p_category text,p_description text,p_value numeric,p_address text,p_packages jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());r public.konsoliss_booking_routes%rowtype;outp jsonb;q public.konsoliss_booking_quotes%rowtype;v integer;bc integer;wc integer;tc integer;
begin
 if actor is null then raise exception 'Sign in to request your quote' using errcode='28000';end if;
 if p_key is null then raise exception 'Request identifier required' using errcode='22023';end if;
 select * into q from public.konsoliss_booking_quotes where customer_id=actor and request_key=p_key;
 if found then return jsonb_build_object('id',q.id,'status',q.status,'reused',true);end if;
 select * into r from public.konsoliss_booking_routes where code=p_route and requests_enabled;
 if not found then raise exception 'Route not available for quotation' using errcode='22023';end if;
 if r.shipping_mode='LCL' and (p_cbm is null or p_cbm<0.02 or p_cbm>68) then raise exception 'Invalid physical volume' using errcode='22023';end if;
 if r.shipping_mode='FCL' and (p_containers is null or p_containers not between 1 and 100) then raise exception 'Invalid container count' using errcode='22023';end if;
 if p_weight is not null and (p_weight<=0 or p_weight>80000) then raise exception 'Invalid weight' using errcode='22023';end if;
 if p_value is not null and (p_value<0 or p_value>100000000) then raise exception 'Invalid merchandise value' using errcode='22023';end if;
 if p_category not in ('unknown','general','electronics','battery','special') then raise exception 'Invalid cargo category' using errcode='22023';end if;
 if r.delivery='door' and length(trim(coalesce(p_address,'')))<8 then raise exception 'Enter destination address' using errcode='22023';end if;
 if p_packages is null or jsonb_typeof(p_packages)<>'array' or jsonb_array_length(p_packages)>100 then raise exception 'Invalid package list' using errcode='22023';end if;
 outp=public.konsoliss_booking_estimate(p_route,p_cbm,p_weight);
 v=case when outp->>'status'='estimate_only' then (outp->>'version')::integer else null end;
 bc=case when v is not null then (outp->>'base_cents')::integer else null end;
 wc=case when v is not null then (outp->>'weight_cents')::integer else null end;
 tc=case when v is not null then (outp->>'total_cents')::integer else null end;
 insert into public.konsoliss_booking_quotes(customer_id,request_key,route_code,shipping_mode,country,region,delivery,address,physical_cbm,estimated_weight_kg,container_count,goods_category,goods_description,declared_value_usd,packages,price_version,base_freight_cents,weight_surcharge_cents,requested_total_cents)
 values(actor,p_key,p_route,r.shipping_mode,r.country,r.region,r.delivery,nullif(trim(p_address),''),case when r.shipping_mode='LCL' then p_cbm else null end,p_weight,case when r.shipping_mode='FCL' then p_containers else null end,p_category,nullif(trim(p_description),''),p_value,p_packages,v,bc,wc,tc) returning * into q;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload) values(actor,'quote.request','quote',q.id::text,jsonb_build_object('route',r.code,'indicative_total_cents',tc));
 return jsonb_build_object('id',q.id,'status',q.status,'estimate',outp,'checkout_enabled',false);
end $$;
create or replace function public.konsoliss_admin_quote_action(p_id uuid,p_action text,p_amount_cents integer default null,p_scope jsonb default null,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());q public.konsoliss_booking_quotes%rowtype;
begin
 if actor is null or not exists(select 1 from public.wantiss_admin_staff where user_id=actor and status='active' and role='super_admin') then raise exception 'Super Admin required' using errcode='42501';end if;
 if p_action not in ('review','info','reject','approve','expire') then raise exception 'Invalid action' using errcode='22023';end if;
 select * into q from public.konsoliss_booking_quotes where id=p_id for update;
 if not found then raise exception 'Quotation not found' using errcode='P0002';end if;
 if q.status in ('cancelled','declined') then raise exception 'Cannot modify closed quote' using errcode='22023';end if;
 if p_action='approve' and (p_amount_cents is null or p_amount_cents<0 or jsonb_typeof(p_scope)<>'object' or
   not (p_scope ?& array['services_included','services_excluded','customs_treatment','delivery_commitment','cargo_review','commercial_approval'])) then
   raise exception 'Scoped approval with itemization, customs, cargo and delivery obligations required' using errcode='22023';
 end if;
 update public.konsoliss_booking_quotes set status=case p_action when 'review' then 'in_review' when 'info' then 'more_info' when 'reject' then 'declined' when 'expire' then 'expired' else 'approved' end,
 approved_total_cents=case when p_action='approve' then p_amount_cents else approved_total_cents end,
 approved_scope=case when p_action='approve' then p_scope else approved_scope end,
 quote_version=quote_version+case when p_action='approve' then 1 else 0 end,
 approved_by=case when p_action='approve' then actor else approved_by end,
 expires_at=case when p_action='approve' then now()+interval '7 days' else expires_at end,
 review_note=left(coalesce(p_note,''),1000),updated_at=now() where id=p_id returning * into q;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)values(actor,'quote.'||p_action,'quote',p_id::text,jsonb_build_object('version',q.quote_version,'amount_cents',p_amount_cents,'reason',left(p_note,1000)));
 return jsonb_build_object('id',q.id,'status',q.status,'quote_version',q.quote_version,'checkout_enabled',false);
end $$;
create or replace function public.konsoliss_admin_booking_copy(p_locale text,p_key text,p_text text,p_publish boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());r public.konsoliss_booking_copy%rowtype;
begin
 if actor is null or not coalesce(public.wantiss_has_permission('content.manage','edit'),false) then raise exception 'Content editing permission required' using errcode='42501';end if;
 if p_publish and not coalesce(public.wantiss_has_permission('content.publish','manage'),false) then raise exception 'Publishing permission required' using errcode='42501';end if;
 if p_locale not in ('en','fr','ht','es','zh-Hans') or p_key !~ '^bookspace\.[a-zA-Z0-9._-]+$' or length(trim(coalesce(p_text,''))) not between 1 and 2000 then raise exception 'Invalid booking text' using errcode='22023';end if;
 insert into public.konsoliss_booking_copy(locale,copy_key,draft_text,published_text,version,reviewed)
 values(p_locale,p_key,p_text,case when p_publish then p_text else null end,1,p_publish)
 on conflict(locale,copy_key) do update set draft_text=excluded.draft_text,published_text=case when p_publish then excluded.draft_text else public.konsoliss_booking_copy.published_text end,version=public.konsoliss_booking_copy.version+1,reviewed=p_publish,updated_at=now() returning * into r;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)values(actor,case when p_publish then 'content.publish' else 'content.draft' end,'booking_copy',p_locale||':'||p_key,jsonb_build_object('version',r.version));
 return jsonb_build_object('key',p_key,'locale',p_locale,'version',r.version,'published',p_publish);
end $$;
create or replace function public.konsoliss_admin_set_booking_route(p_code text,p_requests_enabled boolean,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid());r public.konsoliss_booking_routes%rowtype;
begin
 if actor is null or not exists(select 1 from public.wantiss_admin_staff where user_id=actor and role='super_admin' and status='active') then raise exception 'Super Admin required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<5 then raise exception 'Provide an audit reason' using errcode='22023';end if;
 update public.konsoliss_booking_routes set requests_enabled=p_requests_enabled,updated_at=now() where code=p_code returning * into r;
 if not found then raise exception 'Route not found' using errcode='P0002';end if;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)values(actor,'route.requests','route',p_code,jsonb_build_object('enabled',p_requests_enabled,'reason',p_note));
 return jsonb_build_object('code',r.code,'requests_enabled',r.requests_enabled,'checkout_enabled',false);
end $$;
revoke all on function public.konsoliss_booking_estimate(text,numeric,numeric), public.konsoliss_booking_request(uuid,text,numeric,numeric,integer,text,text,numeric,text,jsonb),public.konsoliss_admin_quote_action(uuid,text,integer,jsonb,text),public.konsoliss_admin_booking_copy(text,text,text,boolean),public.konsoliss_admin_set_booking_route(text,boolean,text) from public,anon;
grant execute on function public.konsoliss_booking_estimate(text,numeric,numeric),public.konsoliss_booking_request(uuid,text,numeric,numeric,integer,text,text,numeric,text,jsonb) to authenticated;
grant execute on function public.konsoliss_admin_quote_action(uuid,text,integer,jsonb,text),public.konsoliss_admin_booking_copy(text,text,text,boolean),public.konsoliss_admin_set_booking_route(text,boolean,text) to authenticated;
revoke all on function public.konsoliss_booking_config() from public;
grant execute on function public.konsoliss_booking_config() to authenticated,anon;
