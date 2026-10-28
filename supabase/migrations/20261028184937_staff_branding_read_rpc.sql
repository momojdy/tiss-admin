create or replace function public.wantiss_admin_get_branding()
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_staff public.wantiss_admin_staff%rowtype;
  v_brand public.wantiss_admin_branding%rowtype;
begin
  if v_uid is null then raise exception 'Sign in is required' using errcode = '42501'; end if;
  select * into v_staff from public.wantiss_admin_staff where user_id = v_uid and status = 'active';
  if not found then raise exception 'Active staff access is required' using errcode = '42501'; end if;
  select * into v_brand from public.wantiss_admin_branding where id = 1;
  if not found then return jsonb_build_object('brand_name','Wantiss','logo_storage_path',null,'wordmark_storage_path',null,'updated_at',null); end if;
  return jsonb_build_object('brand_name',v_brand.brand_name,'logo_storage_path',v_brand.logo_storage_path,
    'wordmark_storage_path',v_brand.wordmark_storage_path,'updated_at',v_brand.updated_at);
end;
$$;
revoke all on function public.wantiss_admin_get_branding() from public, anon;
grant execute on function public.wantiss_admin_get_branding() to authenticated;
