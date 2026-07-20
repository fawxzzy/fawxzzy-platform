-- APPLY_ADMITTED=false
-- INERT SOURCE PACKAGE: review and contained replay are required before any apply.
-- Target-only namespace and security expectation overlay.
create schema if not exists platform_shared;
create schema if not exists discordos;
create schema if not exists fitness;
create schema if not exists mazer;
create schema if not exists platform_private;
create schema if not exists discordos_private;

revoke all on schema public from PUBLIC, anon, authenticated;
revoke all on schema platform_shared from PUBLIC, anon, authenticated;
revoke all on schema discordos from PUBLIC, anon, authenticated;
revoke all on schema fitness from PUBLIC, anon, authenticated;
revoke all on schema mazer from PUBLIC, anon, authenticated;
revoke all on schema platform_private from PUBLIC, anon, authenticated;
revoke all on schema discordos_private from PUBLIC, anon, authenticated;

-- Closed contract relation expectations; definitions remain blocked until generated from reviewed schemas.
-- platform_shared.global_profiles RLS=true FORCE_RLS=true GRANTS=ccdb17d9511de406656f9a61db6d8feb4b48e7b7de1df49d39eeaa31eb3f4110
-- platform_shared.services RLS=true FORCE_RLS=true GRANTS=44e12a3368c7eb22dbe506994c5fed3e95c86392743eec69c78533e0b5d66ae7
-- platform_shared.user_service_memberships RLS=true FORCE_RLS=true GRANTS=ccdb17d9511de406656f9a61db6d8feb4b48e7b7de1df49d39eeaa31eb3f4110
-- platform_shared.service_activation_receipts RLS=true FORCE_RLS=true GRANTS=445113dea030108c0eead4a7f52067863917791289f9eb49b2eb8606be5f7cce
-- platform_private.source_identity_ledger RLS=true FORCE_RLS=true GRANTS=9c404c8c451a7ff81602b84216efa9538c5a73374faa42078e6cc4d4b4ca5d23
-- platform_private.identity_collision_adjudications RLS=true FORCE_RLS=true GRANTS=9c404c8c451a7ff81602b84216efa9538c5a73374faa42078e6cc4d4b4ca5d23
-- fitness.profiles RLS=true FORCE_RLS=true GRANTS=7e0356a9438583b53a4fa46ddde61fa0360dc820a670901acaf144466c17be44
-- mazer.mazer_profiles RLS=true FORCE_RLS=true GRANTS=7e0356a9438583b53a4fa46ddde61fa0360dc820a670901acaf144466c17be44
-- fitness.user_entitlements RLS=true FORCE_RLS=true GRANTS=ccdb17d9511de406656f9a61db6d8feb4b48e7b7de1df49d39eeaa31eb3f4110
-- Closed contract function expectations; no function body is generated in this packet.
-- platform_shared.activate_service EXPOSURE=allowlisted_rpc EXECUTE=authenticated REVOKED=PUBLIC,anon,service_role
-- platform_private.on_auth_user_created EXPOSURE=trigger_only EXECUTE=none REVOKED=PUBLIC,anon,authenticated,service_role
