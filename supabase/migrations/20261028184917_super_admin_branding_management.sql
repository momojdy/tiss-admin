create table if not exists public.wantiss_admin_branding (
  id smallint primary key default 1 check (id = 1),
  brand_name text not null default 'Wantiss' check (char_length(trim(brand_name)) between 1 and 60),
  logo_storage_path text,
  wordmark_storage_path text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.wantiss_admin_branding enable row level security;
revoke all on table public.wantiss_admin_branding from anon, authenticated;

create or replace function public.wantiss_admin_save_branding(
  p_brand_name text,
  p_logo_storage_path text default null,
  p_wordmark_storage_path text default null,
  p_reason text default 'Brand identity updated'
) returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_staff public.wantiss_admin_staff%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_old public.wantiss_admin_branding%rowtype;
  v_name text := trim(coalesce(p_brand_name, ''));
begin
  if v_uid is null then raise exception 'Sign in is required' using errcode = '42501'; end if;
  select * into v_staff from public.wantiss_admin_staff
    where user_id = v_uid and status = 'active' and role = 'super_admin';
  if not found then raise exception 'Only an active Super Admin can change branding' using errcode = '42501'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 60 then raise exception 'Brand name must be between 1 and 60 characters'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'A reason of at least 3 characters is required'; end if;
  select * into v_old from public.wantiss_admin_branding where id = 1 for update;
  if not found then v_old.id := 1; v_old.brand_name := 'Wantiss'; end if;
  if p_logo_storage_path is not null and p_logo_storage_path <> coalesce(v_old.logo_storage_path, '')
     and split_part(p_logo_storage_path, '/', 1) <> v_uid::text then
    raise exception 'New logo must be uploaded by the signed-in Super Admin' using errcode = '42501';
  end if;
  if p_wordmark_storage_path is not null and p_wordmark_storage_path <> coalesce(v_old.wordmark_storage_path, '')
     and split_part(p_wordmark_storage_path, '/', 1) <> v_uid::text then
    raise exception 'New wordmark must be uploaded by the signed-in Super Admin' using errcode = '42501';
  end if;
  v_before := jsonb_build_object('brand_name', v_old.brand_name, 'logo_storage_path', v_old.logo_storage_path, 'wordmark_storage_path', v_old.wordmark_storage_path);
  insert into public.wantiss_admin_branding (id, brand_name, logo_storage_path, wordmark_storage_path, updated_by, updated_at)
  values (1, v_name, p_logo_storage_path, p_wordmark_storage_path, v_uid, now())
  on conflict (id) do update set brand_name = excluded.brand_name, logo_storage_path = excluded.logo_storage_path,
    wordmark_storage_path = excluded.wordmark_storage_path, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  returning jsonb_build_object('brand_name', brand_name, 'logo_storage_path', logo_storage_path,
    'wordmark_storage_path', wordmark_storage_path, 'updated_at', updated_at) into v_after;
  insert into public.wantiss_admin_audit_log (actor_user_id, action, resource_type, resource_id, reason, before_state, after_state)
  values (v_uid, 'branding_updated', 'branding', '1', trim(p_reason), v_before, v_after);
  return v_after;
end;
$$;
revoke all on function public.wantiss_admin_save_branding(text, text, text, text) from public, anon;
grant execute on function public.wantiss_admin_save_branding(text, text, text, text) to authenticated;
