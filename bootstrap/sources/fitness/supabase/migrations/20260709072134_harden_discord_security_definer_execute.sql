/*
  FF-SEC-001: remove public Data API execution from internal Discord/member-number
  SECURITY DEFINER maintenance functions.

  These functions are trigger/operator maintenance paths, not client RPC APIs.
  Keeping SECURITY DEFINER preserves behavior while revoking inherited PUBLIC
  execution prevents anon/authenticated callers from invoking privileged code.
*/

revoke execute on function public.compact_human_member_numbers_after_profile_delete() from public;
revoke execute on function public.compact_human_member_numbers_after_profile_delete() from anon;
revoke execute on function public.compact_human_member_numbers_after_profile_delete() from authenticated;
grant execute on function public.compact_human_member_numbers_after_profile_delete() to service_role;

revoke execute on function public.compact_human_member_numbers_preserving_zero() from public;
revoke execute on function public.compact_human_member_numbers_preserving_zero() from anon;
revoke execute on function public.compact_human_member_numbers_preserving_zero() from authenticated;
grant execute on function public.compact_human_member_numbers_preserving_zero() to service_role;

revoke execute on function public.refresh_discord_member_link_member_number_snapshots() from public;
revoke execute on function public.refresh_discord_member_link_member_number_snapshots() from anon;
revoke execute on function public.refresh_discord_member_link_member_number_snapshots() from authenticated;
grant execute on function public.refresh_discord_member_link_member_number_snapshots() to service_role;

comment on function public.compact_human_member_numbers_after_profile_delete() is
  'Internal trigger maintenance for compacting public human member numbers after profile deletion. Public/anon/authenticated EXECUTE is revoked; trigger execution remains internal.';

comment on function public.compact_human_member_numbers_preserving_zero() is
  'Internal maintenance for compacting positive human member numbers into public slots 1..N while preserving operator-reserved #0. Public/anon/authenticated EXECUTE is revoked.';

comment on function public.refresh_discord_member_link_member_number_snapshots() is
  'Internal maintenance for refreshing discord_member_links user_number/user_kind snapshots from profiles and marking nickname rows for sync. Public/anon/authenticated EXECUTE is revoked.';
