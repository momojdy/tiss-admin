-- Inbound-to-container means warehouse cargo committed to the load but not yet physically loaded.
alter table public.konsoliss_customer_load_progress
  add column if not exists inbound_to_container_cbm numeric(10,3) not null default 0;
alter table public.konsoliss_customer_load_progress
  add constraint konsoliss_staged_goods_not_more_than_sent
  check (loaded_cbm+inbound_to_container_cbm<=sent_cbm);
alter table public.konsoliss_customer_load_progress
  add constraint konsoliss_staged_goods_not_more_than_reserved
  check (loaded_cbm+inbound_to_container_cbm<=reserved_cbm);
drop function if exists public.konsoliss_admin_set_customer_load_progress(uuid,numeric,numeric,numeric,text);
create or replace function public.konsoliss_admin_set_customer_load_progress(
 p_user_id uuid,p_reserved_cbm numeric,p_sent_cbm numeric,p_inbound_cbm numeric,p_loaded_cbm numeric,p_reason text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_before jsonb;v_after jsonb;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.wantiss_admin_staff s
  where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'
 ) then raise exception 'Only active Super Admin may update customer load progress' using errcode='42501'; end if;
 if p_user_id is null or length(trim(coalesce(p_reason,'')))<5 or length(p_reason)>500
 then raise exception 'Customer ID and audit reason (5-500 characters) required' using errcode='22023';end if;
 if p_reserved_cbm is null or p_sent_cbm is null or p_inbound_cbm is null or p_loaded_cbm is null
 or p_reserved_cbm<0 or p_reserved_cbm>68 or p_sent_cbm<0 or p_inbound_cbm<0
 or p_loaded_cbm<0 or p_loaded_cbm+p_inbound_cbm>p_sent_cbm or p_loaded_cbm+p_inbound_cbm>p_reserved_cbm
 then raise exception 'Invalid CBM volumes: inbound plus loaded cannot exceed sent or reserved' using errcode='22023';end if;
 select to_jsonb(p) into v_before from public.konsoliss_customer_load_progress p where p.user_id=p_user_id for update;
 insert into public.konsoliss_customer_load_progress(user_id,reserved_cbm,sent_cbm,inbound_to_container_cbm,loaded_cbm)
 values(p_user_id,p_reserved_cbm,p_sent_cbm,p_inbound_cbm,p_loaded_cbm)
 on conflict(user_id) do update set reserved_cbm=excluded.reserved_cbm,sent_cbm=excluded.sent_cbm,
 inbound_to_container_cbm=excluded.inbound_to_container_cbm,loaded_cbm=excluded.loaded_cbm,updated_at=now();
 select to_jsonb(p) into v_after from public.konsoliss_customer_load_progress p where p.user_id=p_user_id;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values((select auth.uid()),'konsoliss.customer_load.update','konsoliss_customer_load',p_user_id::text,p_reason,v_before,v_after);
 return v_after;
end $$;
revoke all on function public.konsoliss_admin_set_customer_load_progress(uuid,numeric,numeric,numeric,numeric,text) from public,anon;
grant execute on function public.konsoliss_admin_set_customer_load_progress(uuid,numeric,numeric,numeric,numeric,text) to authenticated;
