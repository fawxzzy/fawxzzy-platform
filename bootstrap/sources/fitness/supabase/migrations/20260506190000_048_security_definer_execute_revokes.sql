revoke execute on function public.assign_real_user_number_on_profile_insert() from public;
revoke execute on function public.assign_real_user_number_on_profile_insert() from anon;
revoke execute on function public.assign_real_user_number_on_profile_insert() from authenticated;

revoke execute on function public.is_automation_auth_user(uuid) from public;
revoke execute on function public.is_automation_auth_user(uuid) from anon;
revoke execute on function public.is_automation_auth_user(uuid) from authenticated;
