-- Configure dearly_reminder_dispatch in Supabase Vault and matching Vercel env before applying.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
alter table public.reminder_deliveries add column if not exists request_id bigint;
create or replace function public.dispatch_dearly_reminders() returns void language plpgsql security definer set search_path=public,net,pg_catalog as $$
declare r record; t record; local_now timestamp; k text; body text; target text; rid bigint;
begin
 delete from public.reminder_deliveries d using net._http_response h where d.request_id=h.id and (h.status_code<>200 or h.error_msg is not null);
 for r in select * from public.user_reminders where task_enabled or journal_enabled loop
 begin local_now:=now() at time zone r.timezone; exception when others then local_now:=now() at time zone 'UTC'; end;
 if r.journal_enabled and local_now::time>=r.reminder_time and local_now::time<r.reminder_time+interval '5 minutes' then
 k:='journal:'||local_now::date;
 insert into public.reminder_deliveries(user_id,delivery_key) values(r.user_id,k) on conflict do nothing;
 if found then
 select net.http_post(url:='https://dearly.com.ng/api/reminders/deliver',headers:=jsonb_build_object('Content-Type','application/json','Authorization',('Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='dearly_reminder_dispatch' limit 1))),body:=jsonb_build_object('subscription',r.push_subscription,'notification',jsonb_build_object('title','A moment for your journal ✨','body','How was your day? Come write a little, just for you.','url','/journal','tag',k,'sound',r.sound_enabled))) into rid;
 update public.reminder_deliveries set request_id=rid where user_id=r.user_id and delivery_key=k;
 end if;end if;
 if r.task_enabled then
 for t in select id,title,metadata from public.journal_entries where owner_id=r.user_id and metadata->>'goal_kind'='daily' and coalesce(metadata->>'done','false')<>'true' and metadata->>'due_at' is not null loop
 begin
 if now() >= (t.metadata->>'due_at')::timestamptz - coalesce(nullif(t.metadata->>'reminder_minutes',''),'0')::numeric*interval '1 minute' and now() < (t.metadata->>'due_at')::timestamptz - coalesce(nullif(t.metadata->>'reminder_minutes',''),'0')::numeric*interval '1 minute'+interval '5 minutes' then
 k:='task:'||t.id||':'||(t.metadata->>'due_at')||':'||coalesce(t.metadata->>'reminder_minutes','0');
 insert into public.reminder_deliveries(user_id,delivery_key) values(r.user_id,k) on conflict do nothing;
 if found then
 select net.http_post(url:='https://dearly.com.ng/api/reminders/deliver',headers:=jsonb_build_object('Content-Type','application/json','Authorization',('Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='dearly_reminder_dispatch' limit 1))),body:=jsonb_build_object('subscription',r.push_subscription,'notification',jsonb_build_object('title','Your daily task is calling 🔔','body',t.title,'url','/daily-tasks','tag',k,'sound',r.sound_enabled))) into rid;
 update public.reminder_deliveries set request_id=rid where user_id=r.user_id and delivery_key=k;
 end if;end if;
 exception when invalid_text_representation or invalid_datetime_format then null;end;
 end loop;end if;end loop;
 delete from public.reminder_deliveries where delivered_at<now()-interval '7 days';
end;$$;
revoke all on function public.dispatch_dearly_reminders() from public,anon,authenticated;
select cron.schedule('dearly-daily-reminders','* * * * *','select public.dispatch_dearly_reminders()');
