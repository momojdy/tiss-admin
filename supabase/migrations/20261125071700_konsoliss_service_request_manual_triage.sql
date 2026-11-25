-- Explicit human service-request triage only. Approval does not authorize a payment or a refund.
create or replace function public.konsoliss_admin_review_service_request(
 p_request_id uuid,p_action text,p_note text
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare actor uuid:=(select auth.uid());r public.konsoliss_customer_service_requests%rowtype;
declare next_status text;
begin
 if actor is null or not exists(
   select 1 from public.wantiss_admin_staff s
   where s.user_id=actor and s.status='active' and s.role='super_admin'
 ) then raise exception 'Active Super Admin required' using errcode='42501';end if;
 if p_action not in ('review','need_info','reject','approve_manual') or
  length(trim(coalesce(p_note,''))) not between 10 and 2000 then
  raise exception 'Action and explanatory note (10–2000 characters) required' using errcode='22023';end if;
 select * into r from public.konsoliss_customer_service_requests where id=p_request_id for update;
 if not found then raise exception 'Request not found' using errcode='P0002';end if;
 if r.status in ('resolved','rejected') then raise exception 'Request is closed' using errcode='55000';end if;
 next_status=case p_action when 'review' then 'in_review' when 'need_info' then 'needs_information'
    when 'reject' then 'rejected' else 'approved_pending_manual_settlement' end;
 update public.konsoliss_customer_service_requests
 set status=next_status,reviewer_id=actor,decision_note=trim(p_note)
 where id=r.id returning * into r;
 insert into public.konsoliss_booking_audit(actor_id,operation,target_type,target_id,payload)
 values(actor,'request.'||p_action,'service_request',r.id::text,
 jsonb_build_object('order',r.order_id,'old_status',r.status,'new_status',next_status,'note',trim(p_note),
 'refund_or_return_executed',false));
 return jsonb_build_object('id',r.id,'status',next_status,'refund_or_return_executed',false);
end $function$;
revoke all on function public.konsoliss_admin_review_service_request(uuid,text,text) from public,anon;
grant execute on function public.konsoliss_admin_review_service_request(uuid,text,text) to authenticated;