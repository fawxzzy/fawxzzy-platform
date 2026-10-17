-- Single-transaction local integration source for pinned R001 and reviewed R008 SQL.
-- Provider installation requires separate review, admission and transport proof.
BEGIN;
-- Source-only private card storage foundation. Never run on a provider without
-- a separate exact-target action packet and current catalog/ACL preimage.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL ROLE platform_ops_owner;

DO $preflight$
BEGIN
  IF session_user <> 'postgres' OR current_user <> 'platform_ops_owner'
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_ops_owner' AND rolcanlogin = false)
     OR NOT EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner
                    WHERE n.nspname = 'work' AND r.rolname = 'platform_ops_owner')
     OR NOT has_schema_privilege('platform_ops_owner', 'work', 'CREATE')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'work'
                  AND c.relname IN ('private_cards', 'private_card_batches')) THEN
    RAISE EXCEPTION 'PRIVATE_CARD_STORE_PREIMAGE_MISMATCH';
  END IF;
END $preflight$;

CREATE TABLE work.private_cards (
  stable_id text PRIMARY KEY CHECK (stable_id ~ '^FF-[A-Z0-9][A-Z0-9-]*$'),
  version bigint NOT NULL CHECK (version >= 1),
  body jsonb NOT NULL,
  body_digest text NOT NULL CHECK (body_digest ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT private_cards_body_identity CHECK (
    jsonb_typeof(body) = 'object'
    AND body ->> 'stable_id' = stable_id
    AND body ->> 'version' = version::text
    AND body ->> 'visibility' = 'PRIVATE'
    AND jsonb_typeof(body -> 'criteria') = 'array'
    AND jsonb_typeof(body -> 'dependency_ids') = 'array'
    AND octet_length(body::text) <= 262144
  )
);

CREATE TABLE work.private_card_batches (
  batch_id text PRIMARY KEY CHECK (batch_id ~ '^[a-z][a-z0-9_-]{1,127}$'),
  input_digest text NOT NULL CHECK (input_digest ~ '^sha256:[a-f0-9]{64}$'),
  baseline_digest text NOT NULL CHECK (baseline_digest ~ '^sha256:[a-f0-9]{64}$'),
  post_graph_digest text NOT NULL CHECK (post_graph_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_revision text NOT NULL CHECK (source_revision ~ '^[a-f0-9]{40}$'),
  trust_receipt text NOT NULL CHECK (trust_receipt ~ '^sha256:[a-f0-9]{64}$'),
  changed_ids text[] NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT private_card_batch_changed_ids CHECK (
    cardinality(changed_ids) BETWEEN 1 AND 39
    AND array_position(changed_ids, NULL) IS NULL
  )
);

ALTER TABLE work.private_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE work.private_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE work.private_card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE work.private_card_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY private_cards_owner_access ON work.private_cards
  TO platform_ops_owner USING (true) WITH CHECK (true);
CREATE POLICY private_card_batches_owner_access ON work.private_card_batches
  TO platform_ops_owner USING (true) WITH CHECK (true);

-- Only the NOLOGIN owner has a policy. The later reviewed writer and
-- private reader must get their own narrow definer surface and Auth binding.
REVOKE ALL ON TABLE work.private_cards, work.private_card_batches
  FROM PUBLIC, anon, authenticated, service_role;
RESET ROLE;
-- Source-only extension of private-card-store-r001. No provider authority.
-- Installs NOLOGIN roles and private functions; no Data API route or login.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF current_user <> 'postgres'
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_ops_owner' AND NOT rolcanlogin)
     OR NOT EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner
                    WHERE n.nspname='platform_private' AND r.rolname='platform_ops_owner')
     OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='work' AND c.relname IN ('private_cards','private_card_batches')) <> 2
     OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
                  ('platform_card_sealer','platform_card_writer','platform_card_reader'))
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='platform_private' AND c.relname='private_card_admissions')
     OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='platform_private' AND p.proname LIKE 'private_card_%') THEN
    RAISE EXCEPTION 'PRIVATE_CARD_WRITER_PREIMAGE_MISMATCH';
  END IF;
END $preflight$;

CREATE ROLE platform_card_sealer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE platform_card_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE platform_card_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
SET LOCAL ROLE platform_ops_owner;

CREATE TABLE platform_private.private_card_admissions (
  batch_id text PRIMARY KEY CHECK (batch_id ~ '^[a-z][a-z0-9_-]{1,127}$'),
  input_digest text NOT NULL CHECK (input_digest ~ '^sha256:[a-f0-9]{64}$'),
  baseline_digest text NOT NULL CHECK (baseline_digest ~ '^sha256:[a-f0-9]{64}$'),
  post_graph_digest text NOT NULL CHECK (post_graph_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_revision text NOT NULL CHECK (source_revision ~ '^[a-f0-9]{40}$'),
  trust_receipt text NOT NULL CHECK (trust_receipt ~ '^sha256:[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
ALTER TABLE platform_private.private_card_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_private.private_card_admissions FORCE ROW LEVEL SECURITY;
CREATE POLICY private_card_admissions_owner_access ON platform_private.private_card_admissions
  TO platform_ops_owner USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE platform_private.private_card_admissions
  FROM PUBLIC, anon, authenticated, service_role;

-- The independent sealer has no table DML. It records only a digest of the
-- exact JSONB payload after external immutable-source and policy verification.
CREATE FUNCTION platform_private.private_card_seal(
  payload jsonb, expected_baseline_digest text, expected_post_graph_digest text,
  source_revision text, trust_receipt text, expires_at timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE batch_id text; input_digest text;
BEGIN
  IF jsonb_typeof(payload) <> 'object' OR octet_length(payload::text) > 2097152
     OR jsonb_typeof(payload->'baseline') <> 'array'
     OR jsonb_typeof(payload->'changes') <> 'array'
     OR (SELECT count(*) FROM jsonb_object_keys(payload)) <> 3
     OR NOT (payload ?& ARRAY['batch_id','baseline','changes'])
     OR expected_baseline_digest !~ '^sha256:[a-f0-9]{64}$'
     OR expected_post_graph_digest !~ '^sha256:[a-f0-9]{64}$'
     OR source_revision !~ '^[a-f0-9]{40}$'
     OR trust_receipt !~ '^sha256:[a-f0-9]{64}$'
     OR expires_at <= statement_timestamp()
     OR expires_at > statement_timestamp() + interval '15 minutes' THEN
    RAISE EXCEPTION 'PRIVATE_CARD_SEAL_INVALID';
  END IF;
  batch_id := payload->>'batch_id';
  IF batch_id IS NULL OR batch_id !~ '^[a-z][a-z0-9_-]{1,127}$' THEN
    RAISE EXCEPTION 'PRIVATE_CARD_SEAL_INVALID';
  END IF;
  input_digest := 'sha256:' || encode(sha256(convert_to(payload::text,'UTF8')),'hex');
  INSERT INTO platform_private.private_card_admissions
    (batch_id,input_digest,baseline_digest,post_graph_digest,source_revision,trust_receipt,expires_at)
    VALUES (batch_id,input_digest,expected_baseline_digest,expected_post_graph_digest,
            source_revision,trust_receipt,expires_at);
  RETURN input_digest;
END $function$;

-- One call is one transaction. The table lock covers insert phantoms as well as
-- updates; CAS and receipt either all commit or all roll back. Direct owner or
-- installer writes remain outside this function's threat boundary.
CREATE FUNCTION platform_private.private_card_apply(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
  v_batch_id text; input_digest text; admission record; previous record;
  current_graph jsonb; post_graph jsonb; baseline_digest text; post_digest text;
  change jsonb; next_body jsonb; v_stable_id text; expected_version bigint;
  expected_body_digest text; next_digest text; changed_ids text[] := ARRAY[]::text[];
  affected integer;
BEGIN
  IF jsonb_typeof(payload) <> 'object' OR octet_length(payload::text) > 2097152
     OR jsonb_typeof(payload->'baseline') <> 'array'
     OR jsonb_typeof(payload->'changes') <> 'array'
     OR jsonb_array_length(payload->'changes') NOT BETWEEN 1 AND 39
     OR (SELECT count(*) FROM jsonb_object_keys(payload)) <> 3
     OR NOT (payload ?& ARRAY['batch_id','baseline','changes']) THEN
    RAISE EXCEPTION 'PRIVATE_CARD_BATCH_INVALID';
  END IF;
  v_batch_id := payload->>'batch_id';
  IF v_batch_id IS NULL OR v_batch_id !~ '^[a-z][a-z0-9_-]{1,127}$' THEN
    RAISE EXCEPTION 'PRIVATE_CARD_BATCH_INVALID';
  END IF;
  input_digest := 'sha256:' || encode(sha256(convert_to(payload::text,'UTF8')),'hex');
  PERFORM pg_advisory_xact_lock(148216529, 9);
  LOCK TABLE work.private_cards, work.private_card_batches IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO previous FROM work.private_card_batches b WHERE b.batch_id=v_batch_id;
  IF FOUND THEN
    IF previous.input_digest <> input_digest THEN
      RAISE EXCEPTION 'PRIVATE_CARD_BATCH_COLLISION';
    END IF;
    RETURN jsonb_build_object('disposition','exact_repeat_no_op','batch_id',v_batch_id,
      'input_digest',input_digest,'post_graph_digest',previous.post_graph_digest);
  END IF;
  SELECT * INTO admission FROM platform_private.private_card_admissions a
    WHERE a.batch_id=v_batch_id FOR UPDATE;
  IF NOT FOUND OR admission.input_digest <> input_digest OR admission.consumed_at IS NOT NULL
     OR admission.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'PRIVATE_CARD_BATCH_NOT_ADMITTED';
  END IF;
  SELECT COALESCE(jsonb_agg(body ORDER BY stable_id),'[]'::jsonb) INTO current_graph FROM work.private_cards;
  baseline_digest := 'sha256:' || encode(sha256(convert_to(current_graph::text,'UTF8')),'hex');
  IF current_graph <> payload->'baseline' OR baseline_digest <> admission.baseline_digest THEN
    RAISE EXCEPTION 'PRIVATE_CARD_GRAPH_PREIMAGE';
  END IF;
  FOR change IN SELECT value FROM jsonb_array_elements(payload->'changes') LOOP
    IF jsonb_typeof(change) <> 'object'
       OR (SELECT count(*) FROM jsonb_object_keys(change)) <> 4
       OR NOT (change ?& ARRAY['stable_id','expected_version','expected_body_digest','next'])
       OR jsonb_typeof(change->'next') <> 'object' THEN
      RAISE EXCEPTION 'PRIVATE_CARD_CHANGE_INVALID';
    END IF;
    v_stable_id := change->>'stable_id';
    IF v_stable_id IS NULL OR v_stable_id !~ '^FF-[A-Z0-9][A-Z0-9-]*$'
       OR v_stable_id = ANY(changed_ids)
       OR (change->>'expected_version') !~ '^[0-9]{1,18}$' THEN
      RAISE EXCEPTION 'PRIVATE_CARD_CHANGE_INVALID';
    END IF;
    expected_version := (change->>'expected_version')::bigint;
    expected_body_digest := change->>'expected_body_digest';
    next_body := change->'next';
    IF next_body->>'stable_id' IS DISTINCT FROM v_stable_id
       OR next_body->>'visibility' IS DISTINCT FROM 'PRIVATE'
       OR next_body->>'version' IS DISTINCT FROM (expected_version+1)::text THEN
      RAISE EXCEPTION 'PRIVATE_CARD_CHANGE_INVALID';
    END IF;
    next_digest := 'sha256:' || encode(sha256(convert_to(next_body::text,'UTF8')),'hex');
    IF expected_version = 0 THEN
      IF change->'expected_body_digest' <> 'null'::jsonb THEN
        RAISE EXCEPTION 'PRIVATE_CARD_CHANGE_INVALID';
      END IF;
      INSERT INTO work.private_cards(stable_id,version,body,body_digest)
        VALUES (v_stable_id,1,next_body,next_digest);
    ELSE
      IF expected_body_digest IS NULL OR expected_body_digest !~ '^sha256:[a-f0-9]{64}$' THEN
        RAISE EXCEPTION 'PRIVATE_CARD_CHANGE_INVALID';
      END IF;
      UPDATE work.private_cards SET version=expected_version+1,
        body=next_body,body_digest=next_digest,updated_at=clock_timestamp()
        WHERE private_cards.stable_id=v_stable_id
          AND private_cards.version=expected_version
          AND private_cards.body_digest=expected_body_digest;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 1 THEN RAISE EXCEPTION 'PRIVATE_CARD_CAS'; END IF;
    END IF;
    changed_ids := array_append(changed_ids,v_stable_id);
  END LOOP;
  SELECT COALESCE(jsonb_agg(body ORDER BY stable_id),'[]'::jsonb) INTO post_graph FROM work.private_cards;
  post_digest := 'sha256:' || encode(sha256(convert_to(post_graph::text,'UTF8')),'hex');
  IF post_digest <> admission.post_graph_digest THEN
    RAISE EXCEPTION 'PRIVATE_CARD_GRAPH_POSTIMAGE';
  END IF;
  INSERT INTO work.private_card_batches
    (batch_id,input_digest,baseline_digest,post_graph_digest,source_revision,trust_receipt,changed_ids)
    VALUES (v_batch_id,input_digest,baseline_digest,post_digest,
            admission.source_revision,admission.trust_receipt,changed_ids);
  UPDATE platform_private.private_card_admissions SET consumed_at=clock_timestamp()
    WHERE private_card_admissions.batch_id=v_batch_id;
  RETURN jsonb_build_object('disposition','committed','batch_id',v_batch_id,
    'input_digest',input_digest,'post_graph_digest',post_digest,'changed_ids',to_jsonb(changed_ids));
END $function$;

CREATE FUNCTION platform_private.private_card_read_graph() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $function$
  SELECT COALESCE(jsonb_agg(body ORDER BY stable_id),'[]'::jsonb) FROM work.private_cards
$function$;

CREATE FUNCTION platform_private.private_card_read_batch(target_batch_id text) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $function$
  SELECT jsonb_build_object('batch_id',b.batch_id,'input_digest',b.input_digest,
    'baseline_digest',b.baseline_digest,'post_graph_digest',b.post_graph_digest,
    'changed_ids',to_jsonb(b.changed_ids))
  FROM work.private_card_batches b WHERE b.batch_id=target_batch_id
$function$;

-- Sanitize every new function's effective ACL before installing narrow grants.
DO $acl$ DECLARE f record; a record; BEGIN
  FOR f IN SELECT p.oid,p.oid::regprocedure AS signature,p.proowner
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='platform_private' AND p.proname IN
      ('private_card_seal','private_card_apply','private_card_read_graph','private_card_read_batch') LOOP
    FOR a IN SELECT DISTINCT x.grantee FROM aclexplode(COALESCE(
      (SELECT proacl FROM pg_proc WHERE oid=f.oid),acldefault('f',f.proowner))) x
      WHERE x.grantee<>f.proowner LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %s', f.signature,
        CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END);
    END LOOP;
  END LOOP;
END $acl$;
GRANT USAGE ON SCHEMA platform_private TO platform_card_sealer,platform_card_writer,platform_card_reader;
GRANT EXECUTE ON FUNCTION platform_private.private_card_seal(jsonb,text,text,text,text,timestamptz)
  TO platform_card_sealer;
GRANT EXECUTE ON FUNCTION platform_private.private_card_apply(jsonb)
  TO platform_card_writer;
GRANT EXECUTE ON FUNCTION platform_private.private_card_read_batch(text)
  TO platform_card_writer;
GRANT EXECUTE ON FUNCTION platform_private.private_card_read_graph()
  TO platform_card_reader;
COMMIT;
