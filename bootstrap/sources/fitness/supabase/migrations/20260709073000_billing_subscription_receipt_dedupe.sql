-- Keep one durable billing receipt row per Stripe subscription. Stripe can send
-- checkout, subscription, and invoice webhooks within the same few-second window;
-- without a database guard, those events can race into duplicate receipt rows.

with ranked as (
  select
    id,
    stripe_subscription_id,
    row_number() over (
      partition by stripe_subscription_id
      order by
        (stripe_checkout_session_id is not null) desc,
        (amount_total is not null and currency is not null) desc,
        created_at asc,
        id asc
    ) as receipt_rank
  from public.billing_purchases
  where purchase_kind = 'pro_subscription'
    and stripe_subscription_id is not null
),
canonical as (
  select
    bp.*
  from public.billing_purchases bp
  join ranked r on r.id = bp.id
  where r.receipt_rank = 1
),
rollup as (
  select
    r.stripe_subscription_id,
    min(bp.created_at) as created_at,
    max(bp.completed_at) as completed_at,
    max(bp.period_start) as period_start,
    max(bp.period_end) as period_end,
    (array_remove(array_agg(bp.stripe_checkout_session_id order by (bp.stripe_checkout_session_id is not null) desc), null))[1] as stripe_checkout_session_id,
    (array_remove(array_agg(bp.stripe_payment_intent_id order by (bp.stripe_payment_intent_id is not null) desc), null))[1] as stripe_payment_intent_id,
    (array_remove(array_agg(bp.stripe_customer_id order by (bp.stripe_customer_id is not null) desc), null))[1] as stripe_customer_id,
    (array_remove(array_agg(bp.stripe_price_id order by (bp.stripe_price_id is not null) desc), null))[1] as stripe_price_id,
    (array_remove(array_agg(bp.stripe_invoice_id order by (bp.stripe_invoice_id is not null) desc), null))[1] as stripe_invoice_id,
    (array_remove(array_agg(bp.amount_total order by (bp.amount_total is not null) desc), null))[1] as amount_total,
    (array_remove(array_agg(bp.currency order by (bp.currency is not null) desc), null))[1] as currency,
    (array_remove(array_agg(bp.billing_interval order by (bp.billing_interval is not null) desc), null))[1] as billing_interval,
    (array_remove(array_agg(bp.billing_interval_count order by (bp.billing_interval_count is not null) desc), null))[1] as billing_interval_count
  from public.billing_purchases bp
  join ranked r on r.id = bp.id
  group by r.stripe_subscription_id
)
update public.billing_purchases target
set
  stripe_checkout_session_id = coalesce(target.stripe_checkout_session_id, rollup.stripe_checkout_session_id),
  stripe_payment_intent_id = coalesce(target.stripe_payment_intent_id, rollup.stripe_payment_intent_id),
  stripe_customer_id = coalesce(target.stripe_customer_id, rollup.stripe_customer_id),
  stripe_price_id = coalesce(target.stripe_price_id, rollup.stripe_price_id),
  stripe_invoice_id = coalesce(target.stripe_invoice_id, rollup.stripe_invoice_id),
  amount_total = coalesce(target.amount_total, rollup.amount_total),
  currency = coalesce(target.currency, rollup.currency),
  billing_interval = coalesce(target.billing_interval, rollup.billing_interval),
  billing_interval_count = coalesce(target.billing_interval_count, rollup.billing_interval_count),
  period_start = coalesce(target.period_start, rollup.period_start),
  period_end = coalesce(rollup.period_end, target.period_end),
  completed_at = coalesce(rollup.completed_at, target.completed_at),
  updated_at = now()
from canonical
join rollup on rollup.stripe_subscription_id = canonical.stripe_subscription_id
where target.id = canonical.id;

with ranked as (
  select
    id,
    row_number() over (
      partition by stripe_subscription_id
      order by
        (stripe_checkout_session_id is not null) desc,
        (amount_total is not null and currency is not null) desc,
        created_at asc,
        id asc
    ) as receipt_rank
  from public.billing_purchases
  where purchase_kind = 'pro_subscription'
    and stripe_subscription_id is not null
)
delete from public.billing_purchases bp
using ranked r
where bp.id = r.id
  and r.receipt_rank > 1;

create unique index if not exists billing_purchases_subscription_uq
  on public.billing_purchases (stripe_subscription_id)
  where purchase_kind = 'pro_subscription'
    and stripe_subscription_id is not null;
