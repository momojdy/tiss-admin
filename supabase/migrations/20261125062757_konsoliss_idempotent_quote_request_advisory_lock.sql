CREATE OR REPLACE FUNCTION public.konsoliss_booking_request(p_key uuid, p_route text, p_cbm numeric, p_weight numeric, p_containers integer, p_category text, p_description text, p_value numeric, p_address text, p_packages jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=(select auth.uid());r public.konsoliss_booking_routes%rowtype;outp jsonb;q public.konsoliss_booking_quotes%rowtype;v integer;bc integer;wc integer;tc integer;
begin
 if actor is null then raise exception 'Sign in to request your quote' using errcode='28000';end if;
 if p_key is null then raise exception 'Request identifier required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('konsoliss.booking_request:'||actor::text||':'||p_key::text,0));
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
end $function$
