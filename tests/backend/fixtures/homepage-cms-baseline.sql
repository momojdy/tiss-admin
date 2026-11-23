-- Read-only snapshot of live CMS publishing functions, 2026-11-23.
CREATE OR REPLACE FUNCTION public.wantiss_admin_publish_cms_version(p_content_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := (select auth.uid());
  v_content_key text;
  v_locale text;
  v_row public.wantiss_cms_content%rowtype;
  v_fees jsonb;
begin
  if v_actor is null or not (case when exists(select 1 from public.wantiss_cms_content where id=p_content_id and content_key='goodies.content') then private.goodies_has_staff_permission('content.publish','manage') else public.wantiss_has_permission('content.publish','manage') end) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select c.content_key, c.locale
    into v_content_key, v_locale
    from public.wantiss_cms_content c
   where c.id = p_content_id;
  if not found then
    raise exception 'Draft content not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_content_key || ':' || v_locale, 0));

  select *
    into v_row
    from public.wantiss_cms_content c
   where c.id = p_content_id
     and c.status = 'draft'
   for update;
  if not found then
    raise exception 'Draft content not found';
  end if;

  if v_content_key = 'goodies.content' then
    if v_locale = 'en' then
      select c.payload -> 'fees'
        into v_fees
        from public.wantiss_cms_content c
       where c.content_key = 'goodies.content'
         and c.locale = 'en'
         and c.status = 'published'
       order by c.version desc, c.published_at desc nulls last
       limit 1
       for update;

      if v_fees is not null then
        v_row.payload := jsonb_set(v_row.payload, '{fees}', v_fees, true);
      else
        v_row.payload := v_row.payload - 'fees';
      end if;
    else
      -- Financial policy is global and sourced only from the English record.
      v_row.payload := v_row.payload - 'fees';
    end if;
  end if;

  update public.wantiss_cms_content
     set status = 'archived', updated_by = v_actor, updated_at = now()
   where content_key = v_row.content_key
     and locale = v_row.locale
     and status = 'published';

  update public.wantiss_cms_content
     set payload = v_row.payload,
         status = 'published',
         published_by = v_actor,
         published_at = now(),
         updated_by = v_actor,
         updated_at = now()
   where id = p_content_id;

  insert into public.wantiss_admin_audit_log(
    actor_user_id, action, resource_type, resource_id, reason, after_state
  )
  values (
    v_actor, 'cms_content_published', 'cms_content', p_content_id::text, 'publish',
    jsonb_build_object('content_key', v_row.content_key, 'locale', v_row.locale, 'version', v_row.version)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.wantiss_cms_published_content(p_locale text DEFAULT 'en'::text)
 RETURNS TABLE(content_key text, locale text, version integer, payload jsonb, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select c.content_key,c.locale,c.version,c.payload,c.updated_at
 from public.wantiss_cms_content c
 where c.status='published' and c.locale=p_locale
 and c.version=(select max(c2.version) from public.wantiss_cms_content c2
                where c2.content_key=c.content_key and c2.locale=c.locale and c2.status='published')
 order by c.content_key;
$function$;
