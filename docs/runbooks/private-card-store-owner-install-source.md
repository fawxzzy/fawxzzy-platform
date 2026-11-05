# Private card store owner source

`contracts/v1/installations/private-card-store-r001.sql` is a byte-for-byte
copy of the independently reviewed ATLAS R008 combined SQL. Its SHA-256 is
`6908a5094d8b9f06390ef14adea618ead5412a0648079ff207aea2b582b682bf`.
The adjacent manifest binds the source to the proposed Management API migration
name `private_card_store_r001`. This source is not installed or admitted.

The file is outside `supabase/migrations` and the frozen four-file historical
executable bundle. Neither existing source package is changed. The owner
repository remains contract-first, with no provider connection or credentials.

Supabase's [Management API migration endpoint](https://supabase.com/docs/reference/api/v1-apply-a-migration)
accepts a migration `name` and SQL `query`. The connected MCP implementation
returns only success after forwarding those fields. A server-assigned version,
transaction wrapper, and atomicity of its migration ledger with this SQL are
not established by this source artifact. Record the actual server version only
from a later exact postimage; do not invent one from this file name.

Before any master installation, separately review the SQL in this owner tree,
prove the chosen transport's transaction and ledger behavior, refresh the master
catalog and migration-history preimage, and pass the canonical writer, cost,
rollback, and uncertain-acknowledgement gates. An uncertain response is a
readback hold, never permission to retry. Private card data ingestion and
runtime acceptance remain later steps. The SQL's empty-only rollback must not
be used after private data is written.

## JS planner and SQL wire contract

The pinned SQL is the authority; the JS planner and writer conform to it, not the reverse.

- A sealed or applied payload has exactly three keys: `batch_id`, `baseline`, `changes`.
  Each change has exactly `stable_id`, `expected_version`, `expected_body_digest`, `next`.
  A create uses `expected_version` 0 and a JSON null `expected_body_digest`. `changes` holds 1 to 39 entries.
  Planner-only inputs and checks (`original_criterion_ids`, `expected_graph_digest`, `prior_batch`,
  cycles, orphans, criterion history, fixed-record edits) run in JS and are never sent.
- Every digest is `sha256:` over the UTF-8 bytes of PostgreSQL `jsonb::text`, reproduced by
  `scripts/lib/development-operations-jsonb.mjs`, not RFC 8785. That text uses `", "` and `": "`
  separators, orders keys by UTF-8 byte length then bytewise, and keeps numeric scale. The JS model accepts
  integers only, so fractional or exponent numbers and U+0000 are rejected.
- `baseline` and the graph digests are in `ORDER BY stable_id` order. The SQL uses the database default
  collation. JS sorts bytewise, which equals collation C and was observed to equal Windows `English_United States.1252`
  and ICU `en-US` for ids matching `FF-[A-Z0-9][A-Z0-9-]*`. A glibc locale that ignores punctuation (before glibc 2.28)
  could order `FF-1-A` and `FF-10` differently; this is not verified here, and the effect would fail closed
  as `PRIVATE_CARD_GRAPH_PREIMAGE`. Install only on a database whose `datcollate` was checked.
- `test/private-card-store-postgres.integration.test.mjs` proves the digest equality on a real server. It is
  skipped unless `PG_TEST_URL` is set (a throwaway local cluster only).
