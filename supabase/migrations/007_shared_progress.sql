create or replace function public.arcade_progress(room_id uuid,event jsonb) returns void language plpgsql security definer set search_path=public as $$
declare r arcade_rooms; e jsonb; h jsonb;
begin
 select * into r from arcade_rooms where id=room_id for update;
 if auth.uid() is null or not is_member(r.space_id) or auth.uid() not in (r.owner_id,coalesce(r.guest_id,r.owner_id)) or r.guest_id is null then raise exception 'Join this game first'; end if;
 e=jsonb_build_object('points',greatest(0,least(100000,coalesce((event->>'points')::int,0))),'count',greatest(0,least(10000,coalesce((event->>'count')::int,0))),'total',greatest(1,least(10000,coalesce((event->>'total')::int,1))),'answer',left(event->>'answer',200),'question',left(event->>'question',300),'at',now(),'user_id',auth.uid());
 select coalesce(jsonb_agg(v),'[]') into h from (select value v from jsonb_array_elements(coalesce(r.state->'history','[]')||jsonb_build_array(e)) with ordinality order by ordinality desc limit 20) t;
 select coalesce(jsonb_agg(value order by ordinality desc),'[]') into h from jsonb_array_elements(h) with ordinality;
 update arcade_rooms set state=jsonb_set(jsonb_set(r.state,'{progress}',coalesce(r.state->'progress','{}')||jsonb_build_object(auth.uid()::text,e)),'{history}',h),version=version+1 where id=room_id;
end $$;
revoke all on function public.arcade_progress(uuid,jsonb) from public,anon;
grant execute on function public.arcade_progress(uuid,jsonb) to authenticated;
create or replace function public.entry_notification() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.space_id is not null then
insert into notifications(user_id,title,body) select m.user_id,'A new shared memory','/spaces?space='||new.space_id from shared_space_members m join profiles p on p.id=m.user_id where m.space_id=new.space_id and m.user_id<>new.owner_id and p.notifications_enabled;
end if;return new;end $$;
create or replace function public.invite_connection_once(target_space uuid,target_user uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing uuid; pending text;recipient uuid;
begin
if not owns_space(target_space) then raise exception 'Only the owner can invite';end if;
if not exists(select 1 from connections c where status='accepted' and ((c.requester=auth.uid() and c.recipient=target_user) or (c.recipient=auth.uid() and c.requester=target_user))) then raise exception 'Connect first';end if;
perform pg_advisory_xact_lock(hashtextextended(least(auth.uid()::text,target_user::text)||greatest(auth.uid()::text,target_user::text),0));
select a.space_id into existing from shared_space_members a join shared_space_members b on a.space_id=b.space_id where a.user_id=auth.uid() and b.user_id=target_user order by a.created_at limit 1;
if existing is not null then return jsonb_build_object('url','/spaces?space='||existing);end if;
select n.body,n.user_id into pending,recipient from notifications n join space_invitations i on i.token_hash=encode(extensions.digest(substring(n.body from 16),'sha256'),'hex') join shared_spaces s on s.id=i.space_id where n.body like '/spaces?invite=%' and not i.revoked and i.expires_at>now() and ((n.user_id=auth.uid() and s.owner_id=target_user) or(n.user_id=target_user and s.owner_id=auth.uid())) order by n.created_at limit 1;
if pending is not null then
 if recipient=auth.uid() then return jsonb_build_object('url',pending);end if;
 return jsonb_build_object('pending',true);
end if;
perform invite_connection(target_space,target_user);return jsonb_build_object('sent',true);
end $$;
revoke all on function public.invite_connection_once(uuid,uuid) from public,anon;
grant execute on function public.invite_connection_once(uuid,uuid) to authenticated;
