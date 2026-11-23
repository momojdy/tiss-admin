-- Homepage CMS is copy/assets only. No customer quantities or financial policy.
create or replace function public.konsoliss_validate_homepage_content()
returns trigger language plpgsql set search_path='' as $$
declare required_labels jsonb := '{"home.brand": "Konsoliss", "home.load.heading": "My current load", "home.available": "available", "home.otherCargo": "Other cargo", "home.yourSpace": "Your space", "home.free": "Free", "home.book.title": "Book Space", "home.book.subtitle": "Reserve container capacity", "home.load.title": "Load Items", "home.load.subtitle": "Move warehouse goods", "home.calc.title": "CBM Calculator", "home.calc.subtitle": "Calculate your package volume", "home.warehouse.title": "Warehouse", "home.consolidated.title": "Consolidated", "home.sourcing.title": "Sourcing+", "home.sourcing.subtitle": "Find products, compare prices, get them delivered", "home.how.heading": "How consolidation works", "home.how.1.title": "Book Space", "home.how.1.body": "Reserve the CBM you need for your shipment.\nStarting from 0.02 CBM", "home.how.2.title": "Inbound to warehouse", "home.how.2.body": "Buy on WANTISS, \npaste a product link \nfor us to purchase,\nor ship external items \nto our warehouse.", "home.how.3.title": "Items processing", "home.how.3.body": "We verify incoming items \nand optimize packaging \nwhen needed", "home.how.4.title": "Load items", "home.how.4.body": "Allocate items \nto your reserved space", "home.how.5.title": "Container departs", "home.how.5.body": "Your orders are shipped \nand delivered to you \nor ready for pickup \nat a designated location", "book.heading": "Book Space", "calc.heading": "CBM calculator", "calc.instructions": "Enter size in cm", "calc.length": "Length", "calc.width": "Width", "calc.height": "Height", "calc.quantity": "Quantity", "nav.home": "Home", "nav.warehouse": "Warehouse", "nav.consolidated": "Konso", "nav.sourcing": "Sourcing+", "nav.hub": "Hub", "common.back": "Back", "common.close": "Close", "common.cancel": "Cancel", "common.retry": "Retry", "common.send": "Send request", "common.sending": "Sending…", "status.loading": "Loading container…", "status.unassigned": "No active load", "status.unavailable": "Container unavailable", "status.preparing": "Preparing your load", "status.filling": "Filling", "status.filled": "Filled", "status.departed": "Departed", "status.arrived": "Arrived", "home.noAssignment": "No container assigned", "home.filled": "{percent} filled", "home.loadedInbound": "Loaded {loaded} · Inbound {inbound} CBM", "home.loading": "Loading your container…", "home.noAccountContainer": "No container assigned to your account", "home.measurementsUnavailable": "Verified container measurements are not available yet", "home.containerTotalsHint": "Container totals appear when a container is assigned and its loaded cargo is verified.", "load.loaded": "Loaded", "load.inbound": "Inbound", "load.notAllocated": "Not allocated", "load.breakdown": "My space breakdown", "load.reserved": "Space purchased", "load.sent": "Goods sent", "load.physical": "Physically loaded in container", "load.inboundDetail": "Inbound to container (not yet physically loaded)", "load.allocated": "Loaded + inbound", "load.warehouseTransit": "At warehouse or still in transit", "load.notSent": "Purchased space not yet sent", "load.notCommitted": "Space not yet loaded or inbound", "load.explanation": "Loaded and inbound count toward your purchased space. Goods still at the warehouse or in transit do not count as loaded or inbound to the container.", "warehouse.amount": "{volume} CBM sent, not yet allocated", "warehouse.empty": "No goods sent yet", "warehouse.unavailable": "Warehouse volume not yet recorded", "container.detailsUnavailable": "Load details unavailable", "container.choose": "Choose container", "container.count": "{count} assigned container(s)", "book.capacity": "Container capacity: {capacity} CBM. Live free space must be confirmed before booking.", "book.unavailable": "Booking is unavailable until a verified quote, capacity reservation and payment service are configured. No reservation or payment has been made.", "calc.estimate": "Estimated volume: {volume} CBM", "calc.disclaimer": "Volume estimate only. Physical fit also depends on orientation, weight, stacking and handling. Pricing requires a verified quote.", "calc.invalid": "Enter positive dimensions and a whole-number quantity.", "menu.home": "Home", "menu.messages": "Messages", "menu.notifications": "Notifications", "menu.wallet": "Wallet", "menu.saved": "Saved", "menu.orders": "My Orders", "menu.activity": "Recent Activity", "menu.help": "Help Center", "menu.feedback": "Feedback", "menu.business": "Business Space", "menu.dark": "Dark Mode", "menu.unreadUnavailable": "Unread counts unavailable · Retry", "panel.warehouse": "Warehouse cargo", "panel.load": "Cargo handling", "panel.sourcing": "Sourcing request", "panel.hub": "Konsoliss Hub", "panel.orders": "Shipment history", "panel.loadInfo": "Cargo handling is verified by warehouse staff. Review your recorded quantities or send the team a handling request.", "panel.sourcingInfo": "Send the team your product links and requirements. A support ticket does not place an order or charge your account.", "panel.ordersInfo": "Shipment-level history is not available here yet. Your assigned containers and verified cargo quantities are shown on the homepage.", "support.heading": "Konsoliss support", "support.feedback": "Konsoliss feedback", "support.subject": "Subject", "support.message": "Message", "support.sent": "Request received: {ticket}", "support.error": "Your request could not be confirmed. Your message is preserved. Please retry.", "support.required": "Enter a subject and message.", "support.contact": "Contact the team", "support.info": "Include the relevant container number and cargo details. Never send passwords or payment credentials.", "theme.error": "Your theme preference could not be saved. Please try again.", "canvas.current": "My current loaded space", "canvas.free": "{volume} CBM free", "canvas.ceiling": "Ceiling {height} m", "lifecycle.filling.title": "Container filling", "lifecycle.filling.description": "Your container is currently accepting and loading cargo. You can follow its progress while space is available.", "lifecycle.filled.title": "Container filled", "lifecycle.filled.description": "Loading for this container is complete and no more cargo can be added. It is being prepared for departure.", "lifecycle.departed.title": "Container departed", "lifecycle.departed.description": "Your container has left its departure location and is on the way to its destination. You can follow its shipment progress here.", "lifecycle.arrived.title": "Container arrived", "lifecycle.arrived.description": "Your container has reached its destination. Individual packages may still need customs processing, delivery, or pickup.", "a11y.back": "Back", "a11y.chooseContainer": "Choose container", "a11y.openContainers": "Open your assigned containers", "a11y.loadDetails": "My current load details", "a11y.progress": "Show other progress bar", "a11y.progressHint": "Toggle between cargo loading and container allocation", "a11y.consolidated": "Choose consolidated container", "a11y.quickMenu": "Open Konsoliss quick menu", "a11y.closeDetails": "Close current load details", "a11y.closeBreakdown": "Close load breakdown", "a11y.closeList": "Close container list", "a11y.closeSelector": "Close container selector", "a11y.selectContainer": "Select container {number}", "a11y.explainContainer": "Explain status of {number}", "a11y.dismissStatus": "Dismiss container status explanation", "a11y.statusExplanation": "Container status explanation", "a11y.closeStatus": "Close container status explanation", "a11y.closeMenu": "Close Konsoliss menu", "lifecycle.hint": "This notice closes automatically. Tap the container status anytime to read it again."}'::jsonb; k text; v text; expected text[]; actual text[];
begin
 if new.content_key<>'konsoliss.content' then return new;end if;
 if new.locale is null or new.locale not in ('en','fr','ht','es','zh-Hans') or new.payload->>'v' is distinct from '2'
 or jsonb_typeof(new.payload->'labels') is distinct from 'object'
 or jsonb_typeof(new.payload->'reviewed') is distinct from 'array'
 or jsonb_typeof(new.payload->'images') is distinct from 'object'
 then raise exception 'Invalid Konsoliss homepage schema or locale' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(new.payload) as x(key) where key not in ('v','labels','reviewed','images'))
 or exists(select 1 from jsonb_object_keys(new.payload->'labels') as x(key) where not required_labels ? key)
 then raise exception 'Homepage content cannot contain operational fields or unknown labels' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(new.payload->'labels') as x(key,value) where jsonb_typeof(value)<>'string' or length(value#>>'{}')>4000) then raise exception 'Labels must be text up to 4000 characters' using errcode='22023';end if;
 for k,v in select key,value from jsonb_each_text(new.payload->'images') loop
  if not k=any(array['how.1','how.2','how.3','how.4','how.5','nav.home','nav.warehouse','nav.consolidated','nav.sourcing','nav.hub','menu.logo']) or v !~ '^konsoliss\.[a-zA-Z0-9._-]+$' then raise exception 'Invalid image slot or asset key' using errcode='22023';end if;
  if new.status='published' and not exists(select 1 from public.wantiss_cms_assets a where a.asset_key=v and a.status='published' and a.content_type like 'image/%') then raise exception 'Publish referenced image assets first' using errcode='22023';end if;
 end loop;
 if new.status='published' then
  for k,v in select key,value from jsonb_each_text(required_labels) loop
   if jsonb_typeof(new.payload->'labels'->k) is distinct from 'string' or length(trim(new.payload->'labels'->>k)) not between 1 and 4000 or not (new.payload->'reviewed') ? k then
    raise exception 'Konsoliss text % needs translation review',k using errcode='22023';
   end if;
   select coalesce(array_agg(m[1] order by m[1]),array[]::text[]) into expected from regexp_matches(v,'\{([a-zA-Z][a-zA-Z0-9]*)\}','g') as m;
   select coalesce(array_agg(m[1] order by m[1]),array[]::text[]) into actual from regexp_matches(new.payload->'labels'->>k,'\{([a-zA-Z][a-zA-Z0-9]*)\}','g') as m;
   if actual<>expected then raise exception 'Preserve placeholders in %',k using errcode='22023';end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.konsoliss_validate_homepage_content() from public,anon,authenticated;
create trigger konsoliss_homepage_publication_guard before insert or update on public.wantiss_cms_content
 for each row when(new.content_key='konsoliss.content') execute function public.konsoliss_validate_homepage_content();

create or replace function public.konsoliss_admin_save_homepage(p_locale text,p_payload jsonb,p_expected_version integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); current_version integer; result uuid;
begin
 if actor is null or not coalesce(public.wantiss_has_permission('content.manage','edit'),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_locale not in ('en','fr','ht','es','zh-Hans') or p_locale is null then raise exception 'Invalid locale' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('konsoliss.content:'||p_locale,0));
 select coalesce(max(version),0) into current_version from public.wantiss_cms_content where content_key='konsoliss.content' and locale=p_locale;
 if p_expected_version is distinct from current_version then raise exception 'Homepage changed; reload before saving' using errcode='40001';end if;
 insert into public.wantiss_cms_content(content_key,locale,version,payload,status,created_by,updated_by)
 values('konsoliss.content',p_locale,current_version+1,p_payload,'draft',actor,actor) returning id into result;
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,after_state)
 values(actor,'cms_draft_created','cms_content',result::text,'Konsoliss homepage draft',jsonb_build_object('locale',p_locale,'version',current_version+1));
 return result;
end $$;
revoke all on function public.konsoliss_admin_save_homepage(text,jsonb,integer) from public,anon;
grant execute on function public.konsoliss_admin_save_homepage(text,jsonb,integer) to authenticated;

create or replace function public.konsoliss_admin_publish_homepage(p_content_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare locale_name text;
begin
 if (select auth.uid()) is null or not coalesce(public.wantiss_has_permission('content.publish','manage'),false) then raise exception 'Not authorized' using errcode='42501';end if;
 select locale into locale_name from public.wantiss_cms_content where id=p_content_id and content_key='konsoliss.content';
 if locale_name is null then raise exception 'Homepage draft not found' using errcode='40001';end if;
 perform pg_advisory_xact_lock(hashtextextended('konsoliss.content:'||locale_name,0));
 if p_expected_version is distinct from (select max(version) from public.wantiss_cms_content where content_key='konsoliss.content' and locale=locale_name) then raise exception 'Homepage changed; reload before publishing' using errcode='40001';end if;
 if not exists(select 1 from public.wantiss_cms_content where id=p_content_id and content_key='konsoliss.content' and version=p_expected_version and status='draft') then raise exception 'Saved homepage draft not found' using errcode='40001';end if;
 perform public.wantiss_admin_publish_cms_version(p_content_id);
end $$;
revoke all on function public.konsoliss_admin_publish_homepage(uuid,integer) from public,anon;
grant execute on function public.konsoliss_admin_publish_homepage(uuid,integer) to authenticated;

create or replace function public.konsoliss_admin_get_container_measurements(p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.wantiss_admin_staff where user_id=(select auth.uid()) and role='super_admin' and status='active') then raise exception 'Active Super Admin required' using errcode='42501';end if;
 return jsonb_build_object('progress',(select to_jsonb(p) from public.konsoliss_customer_load_progress p where user_id=p_customer_id),'assignments',coalesce((select jsonb_agg(jsonb_build_object('container_id',c.id,'container_number',c.container_number,'capacity_cbm',c.capacity_cbm,'loaded_cbm',a.loaded_cbm,'allocated_cbm',a.allocated_cbm) order by c.id) from public.konsoliss_container_assignments a join public.konsoliss_containers c on c.id=a.container_id where a.user_id=p_customer_id and a.is_current),'[]'::jsonb));
end $$;
revoke all on function public.konsoliss_admin_get_container_measurements(uuid) from public,anon;
grant execute on function public.konsoliss_admin_get_container_measurements(uuid) to authenticated;

create or replace function public.konsoliss_admin_verify_container_measurements(p_customer_id uuid,p_measurements jsonb,p_expected_updated_at timestamptz,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare progress public.konsoliss_customer_load_progress%rowtype; measurement jsonb; before_state jsonb; total_loaded numeric:=0;total_allocated numeric:=0;loaded numeric;allocated numeric; active_count integer;result jsonb;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.wantiss_admin_staff where user_id=(select auth.uid()) and role='super_admin' and status='active') then raise exception 'Active Super Admin required' using errcode='42501';end if;
 if p_customer_id is null or length(trim(coalesce(p_reason,''))) not between 5 and 500 or jsonb_typeof(p_measurements) is distinct from 'array' then raise exception 'Customer, measurements and audit reason required' using errcode='22023';end if;
 perform 1 from auth.users where id=p_customer_id for update;
 -- Stable lock order serializes allocations shared by different customers.
 perform 1 from public.konsoliss_containers c where exists(select 1 from public.konsoliss_container_assignments a where a.user_id=p_customer_id and a.is_current and a.container_id=c.id) order by c.id for update;
 select * into progress from public.konsoliss_customer_load_progress where user_id=p_customer_id for update;
 if not found then raise exception 'Record reserved and sent totals first' using errcode='22023';end if;
 if progress.updated_at is distinct from p_expected_updated_at then raise exception 'Measurements changed; reload' using errcode='40001';end if;
 select count(*) into active_count from public.konsoliss_container_assignments where user_id=p_customer_id and is_current;
 if active_count=0 or active_count<>jsonb_array_length(p_measurements) or active_count<>(select count(distinct value->>'container_id') from jsonb_array_elements(p_measurements)) then raise exception 'Measure every active container exactly once' using errcode='22023';end if;
 before_state:=public.konsoliss_admin_get_container_measurements(p_customer_id);
 for measurement in select value from jsonb_array_elements(p_measurements) loop
  if jsonb_typeof(measurement) is distinct from 'object' or exists(select 1 from jsonb_object_keys(measurement) as x(key) where key not in ('container_id','loaded_cbm','allocated_cbm')) then raise exception 'Invalid measurement fields' using errcode='22023';end if;
  loaded:=(measurement->>'loaded_cbm')::numeric;allocated:=(measurement->>'allocated_cbm')::numeric;
  if loaded is null or allocated is null or not(loaded>=0 and allocated>=loaded and allocated<=68 and loaded<'Infinity'::numeric and allocated<'Infinity'::numeric) or mod(loaded,0.001)<>0 or mod(allocated,0.001)<>0 then raise exception 'Invalid CBM measurement precision or range' using errcode='22023';end if;
  if not exists(select 1 from public.konsoliss_container_assignments where user_id=p_customer_id and is_current and container_id=(measurement->>'container_id')::uuid) then raise exception 'Customer does not own this assignment' using errcode='42501';end if;
  total_loaded:=total_loaded+loaded;total_allocated:=total_allocated+allocated;
 end loop;
 if total_allocated>progress.sent_cbm or total_allocated>progress.reserved_cbm then raise exception 'Allocation exceeds sent or reserved volume' using errcode='22023';end if;
 for measurement in select value from jsonb_array_elements(p_measurements) loop
  update public.konsoliss_container_assignments set loaded_cbm=(measurement->>'loaded_cbm')::numeric,allocated_cbm=(measurement->>'allocated_cbm')::numeric
   where user_id=p_customer_id and is_current and container_id=(measurement->>'container_id')::uuid;
 end loop;
 update public.konsoliss_customer_load_progress set loaded_cbm=total_loaded,inbound_to_container_cbm=total_allocated-total_loaded,updated_at=clock_timestamp() where user_id=p_customer_id;
 result:=public.konsoliss_admin_get_container_measurements(p_customer_id);
 insert into public.wantiss_admin_audit_log(actor_user_id,action,resource_type,resource_id,reason,before_state,after_state)
 values((select auth.uid()),'konsoliss.container_measurements.verify','konsoliss_customer_load',p_customer_id::text,trim(p_reason),before_state,result);
 return result;
end $$;
revoke all on function public.konsoliss_admin_verify_container_measurements(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.konsoliss_admin_verify_container_measurements(uuid,jsonb,timestamptz,text) to authenticated;

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
 or p_reserved_cbm<0 or p_sent_cbm<0 or p_inbound_cbm<0
 or p_loaded_cbm<0 or p_loaded_cbm+p_inbound_cbm>p_sent_cbm or p_loaded_cbm+p_inbound_cbm>p_reserved_cbm
 then raise exception 'Invalid CBM volumes: inbound plus loaded cannot exceed sent or reserved' using errcode='22023';end if;
 perform 1 from public.konsoliss_containers c where exists(select 1 from public.konsoliss_container_assignments a where a.container_id=c.id and a.user_id=p_user_id and a.is_current) order by c.id for update;
 if exists(select 1 from public.konsoliss_container_assignments where user_id=p_user_id and is_current)
 and not exists(select 1 from public.konsoliss_container_assignments where user_id=p_user_id and is_current and (loaded_cbm is null or allocated_cbm is null))
 and (p_loaded_cbm is distinct from (select sum(loaded_cbm) from public.konsoliss_container_assignments where user_id=p_user_id and is_current)
 or p_inbound_cbm is distinct from (select sum(allocated_cbm-loaded_cbm) from public.konsoliss_container_assignments where user_id=p_user_id and is_current))
 then raise exception 'Use per-container verification to update measured cargo' using errcode='22023';end if;
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

-- Preserve the older RPC signature, but route all updates through atomic reconciliation.
create or replace function public.konsoliss_admin_set_container_load(p_container_id uuid,p_customer_id uuid,p_loaded_cbm numeric,p_allocated_cbm numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; measurements jsonb;
begin
 snapshot:=public.konsoliss_admin_get_container_measurements(p_customer_id);
 if not exists(select 1 from jsonb_array_elements(snapshot->'assignments') a where (a->>'container_id')::uuid=p_container_id) then raise exception 'Customer does not own this container assignment' using errcode='42501';end if;
 select jsonb_agg(jsonb_build_object('container_id',a->>'container_id','loaded_cbm',case when (a->>'container_id')::uuid=p_container_id then to_jsonb(p_loaded_cbm) else a->'loaded_cbm' end,'allocated_cbm',case when (a->>'container_id')::uuid=p_container_id then to_jsonb(p_allocated_cbm) else a->'allocated_cbm' end)) into measurements from jsonb_array_elements(snapshot->'assignments') a;
 return public.konsoliss_admin_verify_container_measurements(p_customer_id,measurements,(snapshot->'progress'->>'updated_at')::timestamptz,p_reason);
end $$;
revoke all on function public.konsoliss_admin_set_container_load(uuid,uuid,numeric,numeric,text) from public,anon;
grant execute on function public.konsoliss_admin_set_container_load(uuid,uuid,numeric,numeric,text) to authenticated;
