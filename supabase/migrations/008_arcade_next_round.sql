-- Keep both seats when either player requests a rematch.
create or replace function public.arcade_next_round(room_id uuid, expected_version integer)
returns public.arcade_rooms language plpgsql security definer set search_path=public as $$
declare r public.arcade_rooms;
begin
 select * into r from public.arcade_rooms where id=room_id for update;
 if not found or auth.uid() is null or not public.is_member(r.space_id)
   or (auth.uid() is distinct from r.owner_id and auth.uid() is distinct from r.guest_id)
 then raise exception 'Players only'; end if;
 if r.version <> expected_version then raise exception 'Game changed. Please try again.'; end if;
 update public.arcade_rooms set version=version+1,state=jsonb_build_object(
 'board',jsonb_build_array('','','','','','','','',''),'turn','X',
 'round',coalesce((state->>'round')::integer,0)+1,'scores','{}'::jsonb)
 where id=r.id returning * into r;
 return r;
end $$;
revoke all on function public.arcade_next_round(uuid,integer) from public,anon;
grant execute on function public.arcade_next_round(uuid,integer) to authenticated;
