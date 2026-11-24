begin;
alter table public.profiles add column if not exists avatar_path text;
create table if not exists public.arcade_rooms (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.shared_spaces on delete cascade,
 owner_id uuid not null references public.profiles on delete cascade, guest_id uuid references public.profiles on delete set null,
 game text not null check(game in ('xo','trivia','wordsearch','pictures','candy')),
 state jsonb not null default '{}'::jsonb, version int not null default 0, created_at timestamptz not null default now()
);
alter table public.arcade_rooms enable row level security;
drop policy if exists arcade_member_read on public.arcade_rooms;
create policy arcade_member_read on public.arcade_rooms for select to authenticated using(public.is_member(space_id));
grant select on public.arcade_rooms to authenticated;
create or replace function public.arcade_create(target_space uuid,game_name text) returns public.arcade_rooms language plpgsql security definer set search_path=public as $$declare r arcade_rooms;begin
 if auth.uid() is null or not is_member(target_space) then raise exception 'Space members only';end if;
 insert into arcade_rooms(space_id,owner_id,game,state) values(target_space,auth.uid(),game_name,jsonb_build_object('board',jsonb_build_array('','','','','','','','',''),'turn','X','round',floor(random()*10000)::int,'scores','{}'::jsonb)) returning * into r;return r;end$$;
create or replace function public.arcade_join(room_id uuid) returns public.arcade_rooms language plpgsql security definer set search_path=public as $$declare r arcade_rooms;begin
 select * into r from arcade_rooms where id=room_id for update;
 if not found or auth.uid() is null or not is_member(r.space_id) then raise exception 'Space members only';end if;
 if r.owner_id=auth.uid() or r.guest_id=auth.uid() then return r;end if;
 if r.guest_id is not null then raise exception 'This two-player game is full';end if;
 update arcade_rooms set guest_id=auth.uid(),version=version+1 where id=room_id returning * into r;return r;end$$;
create or replace function public.arcade_move(room_id uuid,expected_version int,move jsonb) returns public.arcade_rooms language plpgsql security definer set search_path=public as $$declare r arcade_rooms;symbol text;cell int;b jsonb;line int[];winner text;score int;begin
 select * into r from arcade_rooms where id=room_id for update;
 if not found or auth.uid() is null or not is_member(r.space_id) or (auth.uid()<>r.owner_id and auth.uid() is distinct from r.guest_id) then raise exception 'Players only';end if;
 if r.version<>expected_version then raise exception 'The game changed. Try your move again.';end if;
 if r.guest_id is null then raise exception 'Waiting for a second player';end if;
 if r.game='xo' then
 symbol:=case when auth.uid()=r.owner_id then 'X' else 'O' end;
 if coalesce(r.state->>'winner','')<>'' or r.state->>'turn'<>symbol then raise exception 'Wait for your turn';end if;
 cell:=(move->>'cell')::int;b:=r.state->'board';
 if cell<0 or cell>8 or coalesce(b->>cell,'invalid')<>'' then raise exception 'Choose an empty square';end if;
 b:=jsonb_set(b,array[cell::text],to_jsonb(symbol));winner:='';
 foreach line slice 1 in array array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]] loop
 if b->>line[1]=symbol and b->>line[2]=symbol and b->>line[3]=symbol then winner:=symbol;end if;end loop;
 if winner='' and not exists(select 1 from jsonb_array_elements_text(b) x where x='') then winner:='draw';end if;
 r.state:=r.state||jsonb_build_object('board',b,'turn',case when symbol='X' then 'O' else 'X' end,'winner',winner);
 else
 score:=(move->>'score')::int;
 if score<0 or score>100000 then raise exception 'Invalid score';end if;
 if r.state->'scores' ? auth.uid()::text then raise exception 'Your score has already been submitted';end if;
 r.state:=jsonb_set(r.state,array['scores',auth.uid()::text],to_jsonb(score),true);
 end if;
 update arcade_rooms set state=r.state,version=version+1 where id=room_id returning * into r;return r;end$$;
revoke all on function public.arcade_create(uuid,text),public.arcade_join(uuid),public.arcade_move(uuid,int,jsonb) from public,anon;
grant execute on function public.arcade_create(uuid,text),public.arcade_join(uuid),public.arcade_move(uuid,int,jsonb) to authenticated;
do $$declare t text;begin
 foreach t in array array['journal_entries','entry_comments','entry_reactions','notifications','connections','shared_space_members','shared_spaces','arcade_rooms'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
 end loop;
end$$;
commit;
