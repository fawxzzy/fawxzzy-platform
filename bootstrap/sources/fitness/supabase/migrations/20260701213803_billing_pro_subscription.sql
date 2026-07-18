alter table public.billing_customers
  add column if not exists latest_stripe_subscription_id text null;

alter table public.billing_purchases
  add column if not exists stripe_subscription_id text null,
  add column if not exists stripe_invoice_id text null,
  add column if not exists billing_interval text null,
  add column if not exists billing_interval_count integer null,
  add column if not exists period_start timestamptz null,
  add column if not exists period_end timestamptz null;

alter table public.billing_purchases
  drop constraint if exists billing_purchases_purchase_kind_check;

alter table public.billing_purchases
  add constraint billing_purchases_purchase_kind_check check (
    purchase_kind in ('lifetime_pro', 'pro_subscription')
  );

alter table public.billing_purchases
  drop constraint if exists billing_purchases_billing_interval_check;

alter table public.billing_purchases
  add constraint billing_purchases_billing_interval_check check (
    billing_interval in ('month', 'year') or billing_interval is null
  );

create index if not exists billing_purchases_subscription_idx
  on public.billing_purchases (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists billing_purchases_invoice_idx
  on public.billing_purchases (stripe_invoice_id)
  where stripe_invoice_id is not null;

alter table public.user_entitlements
  add column if not exists expires_at timestamptz null,
  add column if not exists source_subscription_id text null;

alter table public.user_entitlements
  drop constraint if exists user_entitlements_entitlement_key_check;

alter table public.user_entitlements
  add constraint user_entitlements_entitlement_key_check check (
    entitlement_key in ('pro_lifetime', 'pro')
  );

comment on table public.billing_purchases is
  'Durable purchase receipts for one-time and recurring Fitness monetization events.';

comment on table public.user_entitlements is
  'Product-access truth derived from verified billing events, including recurring Pro access.';
