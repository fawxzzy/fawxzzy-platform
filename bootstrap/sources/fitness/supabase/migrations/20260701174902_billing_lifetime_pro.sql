create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  stripe_customer_id text not null unique,
  billing_email text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_customers_user_idx
  on public.billing_customers (user_id);

alter table public.billing_customers enable row level security;

drop policy if exists "billing_customers_select_own" on public.billing_customers;
create policy "billing_customers_select_own"
  on public.billing_customers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.billing_customers to authenticated;
grant select, insert, update, delete on public.billing_customers to service_role;

create table if not exists public.billing_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  purchase_kind text not null,
  status text not null default 'pending',
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,
  stripe_customer_id text null,
  stripe_price_id text null,
  amount_total integer null,
  currency text null,
  completed_at timestamptz null,
  raw_event_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_purchases
  drop constraint if exists billing_purchases_purchase_kind_check;

alter table public.billing_purchases
  add constraint billing_purchases_purchase_kind_check check (
    purchase_kind in ('lifetime_pro')
  );

alter table public.billing_purchases
  drop constraint if exists billing_purchases_status_check;

alter table public.billing_purchases
  add constraint billing_purchases_status_check check (
    status in ('pending', 'completed', 'cancelled', 'failed')
  );

create unique index if not exists billing_purchases_checkout_session_uq
  on public.billing_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists billing_purchases_payment_intent_uq
  on public.billing_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists billing_purchases_raw_event_uq
  on public.billing_purchases (raw_event_id)
  where raw_event_id is not null;

create index if not exists billing_purchases_user_created_idx
  on public.billing_purchases (user_id, created_at desc);

create index if not exists billing_purchases_user_kind_status_idx
  on public.billing_purchases (user_id, purchase_kind, status);

alter table public.billing_purchases enable row level security;

drop policy if exists "billing_purchases_select_own" on public.billing_purchases;
create policy "billing_purchases_select_own"
  on public.billing_purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.billing_purchases to authenticated;
grant select, insert, update, delete on public.billing_purchases to service_role;

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entitlement_key text not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  granted_via_purchase_id uuid null references public.billing_purchases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements
  drop constraint if exists user_entitlements_entitlement_key_check;

alter table public.user_entitlements
  add constraint user_entitlements_entitlement_key_check check (
    entitlement_key in ('pro_lifetime')
  );

alter table public.user_entitlements
  drop constraint if exists user_entitlements_status_check;

alter table public.user_entitlements
  add constraint user_entitlements_status_check check (
    status in ('active', 'revoked')
  );

create unique index if not exists user_entitlements_user_key_uq
  on public.user_entitlements (user_id, entitlement_key);

create index if not exists user_entitlements_user_status_idx
  on public.user_entitlements (user_id, status);

alter table public.user_entitlements enable row level security;

drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.user_entitlements to authenticated;
grant select, insert, update, delete on public.user_entitlements to service_role;

comment on table public.billing_customers is
  'Stripe customer mappings for Fitness monetization.';

comment on table public.billing_purchases is
  'Durable purchase receipts for one-time monetization events such as Lifetime Pro.';

comment on table public.user_entitlements is
  'Product-access truth derived from verified billing events.';;
