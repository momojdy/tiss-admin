-- Candidate only: run the existing in-process PostgreSQL acceptance suite before
-- promoting this exact SQL to the shared project's migration history. No seed data.
-- Keep the existing ownership, finite-volume and shared-capacity triggers in place.

create or replace function public.konsoliss_guard_assignment_lifecycle()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_status text;
begin
 if tg_op='UPDATE' and new is not distinct from old then return new; end if;
 if tg_op='DELETE' then v_id:=old.container_id; else v_id:=new.container_id; end if;
 -- Same parent row lock used by the existing capacity guard and admin measurement RPC.
 select status into v_status from public.konsoliss_containers where id=v_id for update;
 if not found then raise exception 'Container not found' using errcode='23503';end if;
 if v_status is distinct from 'filling' then
  raise exception 'Sealed or dispatched container cargo is immutable' using errcode='55000';
 end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end $$;
revoke all on function public.konsoliss_guard_assignment_lifecycle() from public,anon,authenticated;

drop trigger if exists konsoliss_assignment_lifecycle on public.konsoliss_container_assignments;
create trigger konsoliss_assignment_lifecycle
before insert or update or delete on public.konsoliss_container_assignments
for each row execute function public.konsoliss_guard_assignment_lifecycle();

create or replace function public.konsoliss_guard_container_lifecycle()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_next text; v_loaded numeric; v_members bigint; v_verified bigint;
begin
 if tg_op='INSERT' then
  if new.status is distinct from 'filling' then
   raise exception 'A new container must start filling' using errcode='55000';
  end if;
  return new;
 end if;
 if new.status is not distinct from old.status then return new;end if;
 v_next:=case old.status when 'filling' then 'filled' when 'filled' then 'departed' when 'departed' then 'arrived' else null end;
 if v_next is null or new.status is distinct from v_next then
  raise exception 'Invalid lifecycle transition' using errcode='55000';
 end if;
 -- UPDATE already holds the parent row lock; concurrent assignment mutations
 -- serialize on that same row. Do not treat unknown measurements as zero.
 if old.status='filling' then
  select count(*),count(*) filter(where loaded_cbm is not null and allocated_cbm is not null
   and loaded_cbm>=0 and loaded_cbm<'Infinity'::numeric and loaded_cbm=allocated_cbm),
   sum(loaded_cbm)
   into v_members,v_verified,v_loaded
   from public.konsoliss_container_assignments where container_id=old.id and is_current;
  if v_members=0 or v_verified<>v_members or v_loaded is null or v_loaded<=0 or v_loaded>old.capacity_cbm then
   raise exception 'Cannot seal: verify every active load and resolve outstanding inbound cargo' using errcode='55000';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.konsoliss_guard_container_lifecycle() from public,anon,authenticated;

drop trigger if exists konsoliss_container_lifecycle on public.konsoliss_containers;
create trigger konsoliss_container_lifecycle before insert or update of status
on public.konsoliss_containers for each row execute function public.konsoliss_guard_container_lifecycle();

-- Remove the legacy single-assignment fallback to an account-wide loaded amount.
-- The same verified measurements drive both capacity and the physical renderer.
create or replace function public.konsoliss_container_occupancy(p_container_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_actor uuid:=(select auth.uid());v_capacity numeric;v_type text;v_members bigint;v_verified bigint;
 v_loaded numeric;v_allocated numeric;v_my_loaded numeric;v_my_allocated numeric;
begin
 if v_actor is null or p_container_id is null then return null;end if;
 if not exists(select 1 from public.konsoliss_container_assignments where container_id=p_container_id and user_id=v_actor and is_current) then return null;end if;
 select capacity_cbm,container_type into v_capacity,v_type from public.konsoliss_containers where id=p_container_id;
 if v_capacity is distinct from 68 or v_type is distinct from '40HQ' then return null;end if;
 select count(*),count(*) filter(where loaded_cbm is not null and allocated_cbm is not null
  and loaded_cbm>=0 and loaded_cbm<=allocated_cbm and allocated_cbm<=v_capacity),
  sum(loaded_cbm),sum(allocated_cbm),sum(loaded_cbm) filter(where user_id=v_actor),max(allocated_cbm) filter(where user_id=v_actor)
  into v_members,v_verified,v_loaded,v_allocated,v_my_loaded,v_my_allocated
  from public.konsoliss_container_assignments where container_id=p_container_id and is_current;
 if v_members=0 or v_verified<>v_members or v_loaded is null or v_loaded<0
  or v_allocated>v_capacity or v_loaded>v_allocated or v_my_loaded is null or v_my_allocated is null then return null;end if;
 return jsonb_build_object('container_id',p_container_id,'container_type',v_type,'capacity_cbm',v_capacity,
  'loaded_cbm',v_loaded,'your_space_cbm',v_my_loaded,'your_loaded_cbm',v_my_loaded,'your_allocated_cbm',v_my_allocated,
  'other_cargo_cbm',v_loaded-v_my_loaded,'free_cbm',v_capacity-v_loaded,'fill_percent',round(v_loaded/v_capacity*100,2));
end $$;
revoke all on function public.konsoliss_container_occupancy(uuid) from public,anon;
grant execute on function public.konsoliss_container_occupancy(uuid) to authenticated;
