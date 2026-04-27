create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'poll-pending-payments'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'poll-pending-payments',
  '*/5 * * * *',
  $cron$
  with settings as (
    select
      coalesce(
        nullif((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1), ''),
        nullif(current_setting('app.settings.cron_secret', true), '')
      ) as cron_secret,
      coalesce(nullif(current_setting('app.settings.site_url', true), ''), 'https://hypertian.com') as site_url
  )
  select net.http_get(
    url := (select site_url from settings) || '/api/cron/payments',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || coalesce((select cron_secret from settings), '')
    )
  );
  $cron$
);
