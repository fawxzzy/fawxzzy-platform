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
