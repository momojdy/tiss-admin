-- Other customers' assignments remain private under RLS. Invalidate the shared
-- container row so each authorized assignee can refresh aggregate occupancy.
create or replace function public.konsoliss_touch_container_occupancy()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.konsoliss_containers set updated_at=clock_timestamp()
 where id=case when TG_OP='DELETE' then old.container_id else new.container_id end;
 return null;
end $$;
revoke all on function public.konsoliss_touch_container_occupancy() from public,anon,authenticated;
create trigger konsoliss_occupancy_changed after insert or update or delete
 on public.konsoliss_container_assignments for each row
 execute function public.konsoliss_touch_container_occupancy();
do $$
declare relation_name text;
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach relation_name in array array['konsoliss_containers','konsoliss_container_assignments','konsoliss_customer_load_progress'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=relation_name) then
    execute format('alter publication supabase_realtime add table public.%I',relation_name);
   end if;
  end loop;
 end if;
end $$;
