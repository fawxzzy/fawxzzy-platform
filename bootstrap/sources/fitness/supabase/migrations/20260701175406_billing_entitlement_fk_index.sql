create index if not exists user_entitlements_granted_via_purchase_idx
  on public.user_entitlements (granted_via_purchase_id);;
