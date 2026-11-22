-- Expose canonical physical specification to the existing Super Admin container list.
create or replace function public.konsoliss_admin_list_containers()
returns jsonb language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.wantiss_admin_staff s
    where s.user_id=(select auth.uid()) and s.role='super_admin' and s.status='active'
  ) then raise exception 'Konsoliss operations require Super Admin' using errcode='42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',c.id,'container_number',c.container_number,'status',c.status,
      'container_type',c.container_type,'capacity_cbm',c.capacity_cbm,
      'updated_at',c.updated_at,
      'assigned_customers',(select count(*) from public.konsoliss_container_assignments a where a.container_id=c.id and a.is_current)
    ) order by c.updated_at desc)
    from public.konsoliss_containers c
  ),'[]'::jsonb);
end $$;
revoke all on function public.konsoliss_admin_list_containers() from public,anon;
grant execute on function public.konsoliss_admin_list_containers() to authenticated;
