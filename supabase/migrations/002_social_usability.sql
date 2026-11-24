-- Search only public profile names; never expose email addresses or private journals.
create or replace function public.find_profile(exact_username text)
returns table(id uuid,display_name text,username text)
language sql stable security definer set search_path=public as $$
select p.id,p.display_name,p.username from profiles p
where auth.uid() is not null and length(trim(exact_username)) >= 2
and (position(lower(trim(leading '@' from trim(exact_username))) in lower(p.username)) > 0
or position(lower(trim(exact_username)) in lower(p.display_name)) > 0)
and not exists(select 1 from connections c where c.status='blocked' and ((c.requester=auth.uid() and c.recipient=p.id) or(c.recipient=auth.uid() and c.requester=p.id)))
order by (p.username=lower(trim(leading '@' from trim(exact_username)))) desc,p.username limit 20
$$;
create or replace function public.space_member_profiles(target_space uuid)
returns table(user_id uuid,display_name text,username text)
language sql stable security definer set search_path=public as $$
select p.id,p.display_name,p.username from shared_space_members m join profiles p on p.id=m.user_id
where m.space_id=target_space and is_member(target_space)
$$;
create or replace function public.invite_connection(target_space uuid,target_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare code text; space_title text;
begin
if not owns_space(target_space) then raise exception 'Only the space owner can invite people'; end if;
if not exists(select 1 from connections where status='accepted' and ((requester=auth.uid() and recipient=target_user) or (recipient=auth.uid() and requester=target_user))) then raise exception 'Connect with this person first'; end if;
if exists(select 1 from shared_space_members where space_id=target_space and user_id=target_user) then raise exception 'This person is already in your space'; end if;
code:=create_invitation(target_space);
select name into space_title from shared_spaces where id=target_space;
insert into notifications(user_id,title,body) values(target_user,'You are invited to '||space_title,'/spaces?invite='||code);
end$$;
revoke execute on function public.space_member_profiles(uuid),public.invite_connection(uuid,uuid) from public,anon;
grant execute on function public.space_member_profiles(uuid),public.invite_connection(uuid,uuid) to authenticated;
