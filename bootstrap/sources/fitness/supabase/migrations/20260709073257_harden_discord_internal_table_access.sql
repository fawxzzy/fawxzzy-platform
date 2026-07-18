/*
  FF-SEC-001: make internal Discord/support tables explicitly service-role only.

  These tables live in public for legacy reasons, but product/browser clients do not
  need direct table access. RLS already denied row access by default because no
  policies existed; this migration makes that intent explicit and removes inherited
  table grants from public API roles.
*/

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'discord_feedback_reports',
    'discord_member_links',
    'discord_message_command_claims',
    'discord_moderation_cases',
    'discord_spotify_connections',
    'discord_spotify_lobbies',
    'discord_spotify_queue_items',
    'discord_spotify_room_members',
    'discord_update_drafts',
    'discord_verification_tokens'
  ] loop
    execute format('revoke all privileges on table public.%I from public', table_name);
    execute format('revoke all privileges on table public.%I from anon', table_name);
    execute format('revoke all privileges on table public.%I from authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);

    policy_name := table_name || '_deny_public_api_access';
    if not exists (
      select 1
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and p.polname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end $$;
