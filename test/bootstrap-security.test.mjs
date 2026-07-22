import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  applicationCreatorBoundaryV1,
  creatorDefaultAclContractV1,
  dataApiGateV1,
  inspectInertSql,
  inspectPortableBootstrapIdentity,
  publicObjectBoundaryV1,
  targetPostgresqlContractV1,
  verifyApplicationCreatorBoundary,
  verifyCreatorDefaultAcls,
  verifyFitnessPr108ReplayGate,
  verifyGeneratedArtifactPathBoundary,
  verifyHeldControlPlaneContracts,
  verifyEffectiveFunctionAcls,
  verifyGeneratedFitnessFunctionSearchPaths
} from '../scripts/verify-target-bootstrap.mjs';

const marker = '-- APPLY_ADMITTED=false\n';

test('security verifier rejects data, Cron, network, extension, provider, and public-object effects', () => {
  const fixtures = [
    'insert into fitness.profiles(id) values (1);',
    "select cron.schedule('job', '* * * * *', 'select 1');",
    "select net.http_post(url := 'blocked');",
    'create extension pg_cron;',
    'create table auth.shadow(id bigint);',
    'create table public.product_table(id bigint);',
    'create materialized view public.product_rollup as select 1;',
    'CrEaTe\n OR   RePlAcE\tFuNcTiOn PUBLIC  .  DISCORDOS_LEAK() returns void language sql as $$ select 1 $$;',
    'select 1; -- https://example.invalid/hook'
  ];
  for (const fixture of fixtures) assert.notEqual(inspectInertSql('negative.sql', `${marker}${fixture}\n`).length, 0, fixture);
});

test('security verifier rejects every dependent reference to a held function', () => {
  const held = ['fitness.is_automation_auth_user'];
  const fixtures = [
    'grant execute on function fitness.is_automation_auth_user(uuid) to authenticated;',
    'revoke execute on function fitness.is_automation_auth_user(uuid) from PUBLIC;',
    'comment on function fitness.is_automation_auth_user(uuid) is null;',
    'create trigger check_user before insert on fitness.profiles execute function fitness.is_automation_auth_user();',
    'create function fitness.wrapper() returns boolean language sql as $$ select fitness.is_automation_auth_user(auth.uid()) $$;'
  ];
  for (const fixture of fixtures) {
    assert.notEqual(inspectInertSql('00000000000002_fitness_schema_inert.sql', `${marker}${fixture}\n`, held).length, 0, fixture);
  }
  assert.notEqual(inspectInertSql('negative.sql', `${marker}comment on function ;\n`, held).length, 0);
});

test('actual held evidence closes the previously broken Fitness function references', () => {
  const dispositions = JSON.parse(fs.readFileSync(new URL('../bootstrap/manifests/dispositions.v1.json', import.meta.url), 'utf8'));
  const expected = [
    'fitness.assign_real_user_number_on_profile_insert',
    'fitness.is_automation_auth_user',
    'fitness.consume_discord_verification_token',
    'fitness.upsert_discord_member_link',
    'fitness.compact_human_member_numbers_preserving_zero',
    'fitness.refresh_discord_member_link_member_number_snapshots'
  ];
  const targets = new Set(dispositions.held_functions.map((unit) => unit.target_identity));
  for (const identity of expected) assert.equal(targets.has(identity), true, identity);
  assert.ok(dispositions.held_statements.some((unit) => unit.blocker_class === 'held_function_dependency' && unit.referenced_held_functions.some((reference) => reference.target_identity === 'fitness.is_automation_auth_user')));
});

test('security verifier rejects private exposure, PUBLIC execute, provider commands, and missing marker', () => {
  const fixtures = [
    `${marker}grant usage on schema platform_private to authenticated;`,
    `${marker}grant execute on function fitness.f() to PUBLIC;`,
    `${marker}supabase db push;`,
    'select 1;'
  ];
  for (const fixture of fixtures) assert.notEqual(inspectInertSql('negative.sql', fixture).length, 0, fixture);
});

test('security verifier accepts a deny-by-default inert schema unit', () => {
  const sql = `${marker}create schema if not exists fitness;\nrevoke all on schema fitness from PUBLIC, anon, authenticated;\n`;
  assert.deepEqual(inspectInertSql('positive.sql', sql), []);
});

function creatorAclFixture() {
  const schemas = creatorDefaultAclContractV1.schemas;
  const privileges = creatorDefaultAclContractV1.object_classes;
  const statements = [
    'set role postgres;',
    `do $current_user_guard$ begin if current_user <> 'postgres' then raise exception 'target bootstrap requires postgres current_user'; end if; end $current_user_guard$;`,
    ...schemas.flatMap((schema) => [
      `create schema if not exists ${schema} authorization postgres;`,
      `alter schema ${schema} owner to postgres;`,
      `revoke create on schema ${schema} from supabase_admin;`
    ]),
    ...schemas.flatMap((schema) => Object.entries(privileges).filter(([objectClass]) => objectClass !== 'FUNCTIONS').map(([objectClass, values]) =>
      `alter default privileges for role postgres in schema ${schema} revoke ${values.join(', ')} on ${objectClass.toLowerCase()} from ${creatorDefaultAclContractV1.grantees.join(', ')};`)),
    'create table fitness.example(id bigint);'
  ];
  const units = [];
  for (const creatorRole of creatorDefaultAclContractV1.creator_roles) {
    for (const schema of schemas) {
      for (const [objectClass, values] of Object.entries(privileges)) {
        const executable = creatorRole === 'postgres' && objectClass !== 'FUNCTIONS';
        const signatureAssertion = creatorRole === 'postgres' && objectClass === 'FUNCTIONS';
        units.push({
          creator_role: creatorRole,
          schema,
          object_class: objectClass,
          privileges: [...values],
          grantees: [...creatorDefaultAclContractV1.grantees],
          status: creatorRole === 'postgres' ? 'REQUIRED' : 'BLOCKED',
          execution_disposition: executable
            ? 'EXECUTABLE_INERT_SOURCE'
            : signatureAssertion ? 'ASSERT_SIGNATURE_SPECIFIC_REVOKE' : 'NOT_EXECUTABLE',
          ...(creatorRole === 'supabase_admin' ? { blocker_class: 'BLOCKED_PROVIDER_ROLE' } : {}),
          effect_sha256: crypto.createHash('sha256').update(`${JSON.stringify({
            creator_role: creatorRole,
            schema,
            object_class: objectClass,
            privileges: values,
            grantees: creatorDefaultAclContractV1.grantees
          }, null, 2)}\n`).digest('hex')
        });
      }
    }
  }
  return {
    files: [['01.sql', `${marker}${statements.join('\n')}\n`]],
    manifest: { ...creatorDefaultAclContractV1, units }
  };
}

test('creator default ACL verifier freezes 12 executable, 6 signature, and 18 provider-blocked units', () => {
  const fixture = creatorAclFixture();
  assert.deepEqual(verifyCreatorDefaultAcls(
    fixture.files,
    creatorDefaultAclContractV1,
    targetPostgresqlContractV1,
    fixture.manifest,
    targetPostgresqlContractV1
  ), []);

  const baseSql = fixture.files[0][1];
  const firstAcl = /alter default privileges for role postgres[^;]+;/i.exec(baseSql)[0];
  const cases = [
    baseSql.replace(/alter default privileges for role postgres[^;]+;/i, ''),
    baseSql.replace(/(alter default privileges for role postgres[^;]+;)/i, '$1\n$1'),
    baseSql.replace('for role postgres in schema discordos', 'for role supabase_admin in schema discordos'),
    baseSql.replace('SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'),
    baseSql.replace('PUBLIC, anon, authenticated, service_role', 'PUBLIC, anon, authenticated'),
    baseSql.replace(firstAcl, '').replace('create table fitness.example(id bigint);', `create table fitness.example(id bigint);\n${firstAcl}`)
  ];
  for (const sql of cases) {
    assert.notEqual(verifyCreatorDefaultAcls(
      [['01.sql', sql]],
      creatorDefaultAclContractV1,
      targetPostgresqlContractV1,
      fixture.manifest,
      targetPostgresqlContractV1
    ).length, 0, sql.slice(0, 120));
  }

  const relabeled = structuredClone(fixture.manifest);
  relabeled.units.find((unit) => unit.creator_role === 'supabase_admin').status = 'REQUIRED';
  assert.match(verifyCreatorDefaultAcls(
    fixture.files,
    creatorDefaultAclContractV1,
    targetPostgresqlContractV1,
    relabeled,
    targetPostgresqlContractV1
  ).join('\n'), /disposition matrix drift|held default ACL denominator/);
});

test('application creator boundary rejects provider CREATE and owner or creator drift', () => {
  const fixture = creatorAclFixture();
  assert.deepEqual(verifyApplicationCreatorBoundary(fixture.files, applicationCreatorBoundaryV1, applicationCreatorBoundaryV1), []);
  for (const sql of [
    fixture.files[0][1].replace('revoke create on schema fitness from supabase_admin;', 'grant create on schema fitness to supabase_admin;'),
    fixture.files[0][1].replace('alter schema fitness owner to postgres;', 'alter schema fitness owner to supabase_admin;'),
    fixture.files[0][1].replace('set role postgres;', 'set role supabase_admin;'),
    fixture.files[0][1].replace('create table fitness.example', 'reset role;\ncreate table fitness.example'),
    fixture.files[0][1].replace(/do \$current_user_guard\$[\s\S]*?\$current_user_guard\$;/, ''),
    fixture.files[0][1].replace('create table fitness.example', 'set role supabase_admin;\ncreate table fitness.example')
  ]) {
    assert.notEqual(verifyApplicationCreatorBoundary([['01.sql', sql]], applicationCreatorBoundaryV1, applicationCreatorBoundaryV1).length, 0);
  }
});

test('held public and Data API contracts reject public vocabulary and object drift', () => {
  const config = {
    schemas: { application: [...creatorDefaultAclContractV1.schemas] },
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  const manifest = {
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  assert.deepEqual(verifyHeldControlPlaneContracts(config, manifest), []);
  for (const mutate of [
    (value) => value.schemas.application.push('public'),
    (value) => { value.public_object_boundary.application_object_count = 1; }
  ]) {
    const drifted = structuredClone(config);
    mutate(drifted);
    assert.notEqual(verifyHeldControlPlaneContracts(drifted, manifest).length, 0);
  }
});

test('Data API gate v1.3.0 rejects the exact 24 current, desired, execution, support, authority, and admission drift classes in config and manifest', () => {
  const config = {
    schemas: { application: [...creatorDefaultAclContractV1.schemas] },
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  const manifest = {
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  const cases = [
    ['01 current state replaced by desired state', [
      (gate) => { gate.observed_current_preimage = structuredClone(gate.desired_containment_postimage); },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.identity_binding = 'EMBEDDED'; },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.source_artifact_contains_identity = true; },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.fresh_project_identity_readback = 'UNKNOWN'; },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.fresh_preimage_readback = 'UNKNOWN'; },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.expected_state_guard = 'UNKNOWN'; },
      (gate) => { gate.observed_current_preimage.action_time_expected_state_binding.owner_authority = 'UNKNOWN'; }
    ]],
    ['02 observed API state changed', [
      (gate) => { gate.observed_current_preimage.data_api_state = 'DISABLED'; }
    ]],
    ['03 observed exposed-schema order changed', [
      (gate) => gate.observed_current_preimage.exposed_schemas.reverse()
    ]],
    ['04 observed extra-search-path order changed', [
      (gate) => gate.observed_current_preimage.extra_search_path.reverse()
    ]],
    ['05 public omitted from observed extra search path', [
      (gate) => { gate.observed_current_preimage.extra_search_path = ['extensions']; }
    ]],
    ['06 observed automatic exposure promoted', [
      (gate) => { gate.observed_current_preimage.automatic_exposure = 'ON'; }
    ]],
    ['07 table availability and exposure conflated', [
      (gate) => { gate.observed_current_preimage.tables = 0; }
    ]],
    ['08 function availability and exposure conflated', [
      (gate) => { gate.observed_current_preimage.functions = 0; }
    ]],
    ['09 unknown view denominator promoted', [
      (gate) => { gate.observed_current_preimage.views.available = 0; },
      (gate) => { gate.observed_current_preimage.views.exposed = 0; }
    ]],
    ['10 desired API containment changed', [
      (gate) => { gate.desired_containment_postimage.data_api_state = 'ENABLED'; }
    ]],
    ['11 desired exposed-schema set made nonempty', [
      (gate) => gate.desired_containment_postimage.exposed_schemas.push('public')
    ]],
    ['12 desired search path weakened', [
      (gate) => { gate.desired_containment_postimage.extra_search_path = ['public', 'extensions']; },
      (gate) => { gate.desired_containment_postimage.extra_search_path = []; }
    ]],
    ['13 future maximum allowlist reordered or widened', [
      (gate) => gate.future_activation_gates.maximum_exposed_schemas.reverse(),
      (gate) => gate.future_activation_gates.maximum_exposed_schemas.push('other'),
      (gate) => gate.future_activation_gates.maximum_exposed_schemas.push('public')
    ]],
    ['14 forbidden schema removed', [
      ...dataApiGateV1.future_activation_gates.never_exposed_schemas.map((schema) =>
        (gate) => { gate.future_activation_gates.never_exposed_schemas = gate.future_activation_gates.never_exposed_schemas.filter((value) => value !== schema); })
    ]],
    ['15 failed Save promoted to persisted success', [
      (gate) => { gate.attempted_execution.overview_saves_persisted = 1; },
      (gate) => { gate.attempted_execution.outcome = 'PASS'; }
    ]],
    ['16 Settings Save invented', [
      (gate) => { gate.attempted_execution.settings_save_attempts = 1; }
    ]],
    ['17 provider or rollback mutation invented', [
      (gate) => { gate.attempted_execution.persisted_provider_mutations = 1; },
      (gate) => { gate.attempted_execution.rollback_saves = 1; }
    ]],
    ['18 Support case identity, state, response, or defect changed', [
      (gate) => { delete gate.support_evidence.case_id; },
      (gate) => { gate.support_evidence.case_id = 'SU-000000'; },
      (gate) => { gate.support_evidence.case_status = 'CURRENT'; },
      (gate) => { gate.support_evidence.response.timestamp = 'CURRENT'; },
      (gate) => { gate.support_evidence.provider_defect_classification = 'CONFIRMED'; }
    ]],
    ['19 accepted Support evidence changed', [
      (gate) => { gate.support_evidence.sanitized_title = 'changed'; },
      (gate) => { gate.support_evidence.original_title_sha256 = '0'.repeat(64); },
      (gate) => { gate.support_evidence.body_sha256 = '0'.repeat(64); },
      (gate) => { gate.support_evidence.confirmed_at = '2026-07-19T17:39:40.794Z'; }
    ]],
    ['20 guarded reproduction authority consumed or broadened', [
      (gate) => { gate.retry_authority.manual_decision.guarded_reproduction_attempt_limit = 2; },
      (gate) => { gate.retry_authority.manual_decision.guarded_reproduction_attempts_executed = 1; },
      (gate) => { gate.retry_authority.prior_authority_consumed = false; }
    ]],
    ['21 manual decision or separate provider-execution gate weakened', [
      (gate) => { gate.retry_authority.manual_decision.decision_id = 'FP-MAN-UNKNOWN'; },
      (gate) => { gate.retry_authority.manual_decision.question_event_id = 'onv1_9cce7f3612508739dc826bc5e292de7ec329bbf64d71dfb31ff22619dc80e6f3'; },
      (gate) => { gate.retry_authority.manual_decision.question_payload_sha256 = gate.retry_authority.manual_decision.answer_payload_sha256; },
      (gate) => { gate.retry_authority.manual_decision.answer_event_id = 'onv1_' + '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.answer_payload_sha256 = '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.answer_text_sha256 = '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.unexpected_envelope_field = true; },
      (gate) => { gate.retry_authority.manual_decision.decision = 'APPROVE_PROVIDER_EXECUTION'; },
      (gate) => { gate.retry_authority.manual_decision.policy_only = false; },
      (gate) => { gate.retry_authority.manual_decision.provider_execution_authority_granted = true; },
      (gate) => { gate.retry_authority.rejected_decision_collisions = []; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].decision_id = 'FP-MAN-047'; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].data_api_authority_granted = true; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].guarded_reproduction_attempts_executed = 1; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].reuse_for_data_api_forbidden = false; },
      (gate) => { gate.retry_authority.provider_execution.separate_packet_required = false; },
      (gate) => { gate.retry_authority.provider_execution.packet_admitted = true; },
      (gate) => { gate.retry_authority.provider_execution.support_response_grants_execution_authority = true; }
    ]],
    ['22 required REST GraphQL or RPC probe removed or falsely complete', [
      ...['REST', 'GRAPHQL', 'RPC'].flatMap((probe) => [
        (gate) => { delete gate.future_activation_gates.negative_probes[probe]; },
        (gate) => { gate.future_activation_gates.negative_probes[probe] = 'CURRENT'; }
      ])
    ]],
    ['23 exact rollback preimage or reverse order weakened', [
      (gate) => { gate.future_activation_gates.rollback.preimage = 'inferred'; },
      (gate) => gate.future_activation_gates.rollback.order.reverse(),
      (gate) => { gate.future_activation_gates.rollback.expected_state_guarded = false; }
    ]],
    ['24 setting bootstrap or target apply promoted', [
      ...['setting_mutation_admitted', 'bootstrap_apply_admitted', 'target_apply_admitted'].map((field) =>
        (gate) => { gate.bootstrap_admission[field] = true; })
    ]]
  ];

  assert.equal(cases.length, 24);
  for (const [name, variants] of cases) {
    for (const [variantIndex, mutate] of variants.entries()) {
      const configDrift = structuredClone(config);
      mutate(configDrift.data_api_gate);
      assert.notEqual(
        verifyHeldControlPlaneContracts(configDrift, manifest).length,
        0,
        `${name}, config variant ${variantIndex + 1}`
      );

      const manifestDrift = structuredClone(manifest);
      mutate(manifestDrift.data_api_gate);
      assert.notEqual(
        verifyHeldControlPlaneContracts(config, manifestDrift).length,
        0,
        `${name}, manifest variant ${variantIndex + 1}`
      );
    }
  }
});

test('Data API gate v1.3.0 rejects the exact 15 Support-response, authority, collision, redaction, admission, and package drift classes', () => {
  const config = {
    schemas: { application: [...creatorDefaultAclContractV1.schemas] },
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  const manifest = {
    public_object_boundary: publicObjectBoundaryV1,
    data_api_gate: dataApiGateV1
  };
  const gateCases = [
    ['01 missing or changed case identity', [
      (gate) => { delete gate.support_evidence.case_id; },
      (gate) => { gate.support_evidence.case_id = 'SU-000000'; }
    ]],
    ['02 invented case status', [
      (gate) => { gate.support_evidence.case_status = 'OPEN'; }
    ]],
    ['03 invented response timestamp', [
      (gate) => { gate.support_evidence.response.timestamp = 'CURRENT'; }
    ]],
    ['04 provider defect promotion', [
      (gate) => { gate.support_evidence.provider_defect_classification = 'CONFIRMED'; },
      (gate) => { gate.support_evidence.root_cause_classification = 'CONFIRMED'; }
    ]],
    ['05 role change or undocumented endpoint invention', [
      (gate) => { gate.support_evidence.role_change_classification = 'CONFIRMED'; },
      (gate) => { gate.support_evidence.alternate_endpoint_classification = 'CONFIRMED'; }
    ]],
    ['06 paid action invention', [
      (gate) => { gate.support_evidence.paid_action_classification = 'CONFIRMED'; }
    ]],
    ['07 raw Support body or diagnostic artifact serialization', [
      (gate) => { gate.support_evidence.response.serialized_artifacts = true; },
      (gate) => { gate.support_evidence.response.raw_support_body = 'REDACTED_FIXTURE'; }
    ]],
    ['08 secret, token, cookie, header, or network payload serialization', [
      ...['NETWORK_BODIES', 'HEADERS', 'COOKIES', 'TOKENS', 'KEYS', 'REQUEST_PAYLOADS', 'RESPONSE_PAYLOADS'].map((forbiddenClass) =>
        (gate) => { gate.retry_authority.diagnostic_redaction.forbidden_serialized_classes = gate.retry_authority.diagnostic_redaction.forbidden_serialized_classes.filter((value) => value !== forbiddenClass); })
    ]],
    ['09 reproduction attempt count above one', [
      (gate) => { gate.support_evidence.response.requested_reproduction_attempts = 2; },
      (gate) => { gate.retry_authority.manual_decision.guarded_reproduction_attempt_limit = 2; }
    ]],
    ['10 authority silently consumed or broadened', [
      (gate) => { gate.retry_authority.manual_decision.guarded_reproduction_attempts_executed = 1; },
      (gate) => { gate.retry_authority.manual_decision.question_event_id = 'onv1_9cce7f3612508739dc826bc5e292de7ec329bbf64d71dfb31ff22619dc80e6f3'; },
      (gate) => { gate.retry_authority.manual_decision.question_payload_sha256 = '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.answer_event_id = 'onv1_' + '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.answer_payload_sha256 = '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.answer_text_sha256 = '0'.repeat(64); },
      (gate) => { gate.retry_authority.manual_decision.unexpected_envelope_field = true; },
      (gate) => { gate.retry_authority.manual_decision.policy_only = false; },
      (gate) => { gate.retry_authority.manual_decision.provider_execution_authority_granted = true; },
      (gate) => { gate.retry_authority.prior_authority_consumed = false; },
      (gate) => { gate.retry_authority.status = 'CURRENT'; }
    ]],
    ['11 rejected decision collision removed or granted Data API authority', [
      (gate) => { gate.retry_authority.rejected_decision_collisions = []; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].decision_id = 'FP-MAN-047'; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].classification = 'CURRENT'; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].data_api_authority_granted = true; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].guarded_reproduction_attempts_executed = 1; },
      (gate) => { gate.retry_authority.rejected_decision_collisions[0].reuse_for_data_api_forbidden = false; }
    ]],
    ['12 Support response treated as provider execution authority', [
      (gate) => { gate.retry_authority.provider_execution.support_response_grants_execution_authority = true; },
      (gate) => { gate.retry_authority.provider_execution.source_contract_grants_execution_authority = true; },
      (gate) => { gate.retry_authority.provider_execution.packet_admitted = true; }
    ]],
    ['13 bootstrap or target apply promotion', [
      (gate) => { gate.bootstrap_admission.bootstrap_apply_admitted = true; },
      (gate) => { gate.bootstrap_admission.target_apply_admitted = true; }
    ]],
    ['14 config and manifest gate divergence', [
      (gate) => { gate.version = '1.3.1'; }
    ]]
  ];

  assert.equal(gateCases.length, 14);
  for (const [name, variants] of gateCases) {
    for (const [variantIndex, mutate] of variants.entries()) {
      const configDrift = structuredClone(config);
      mutate(configDrift.data_api_gate);
      assert.notEqual(
        verifyHeldControlPlaneContracts(configDrift, manifest).length,
        0,
        `${name}, config variant ${variantIndex + 1}`
      );

      const manifestDrift = structuredClone(manifest);
      mutate(manifestDrift.data_api_gate);
      assert.notEqual(
        verifyHeldControlPlaneContracts(config, manifestDrift).length,
        0,
        `${name}, manifest variant ${variantIndex + 1}`
      );
    }
  }

  const generatorConfig = JSON.parse(fs.readFileSync(new URL('../bootstrap/generator/config.v1.json', import.meta.url), 'utf8'));
  const replayGate = JSON.parse(fs.readFileSync(new URL('../contracts/v1/gates/fitness-pr108-replay-gate.json', import.meta.url), 'utf8'));
  const sourceManifest = JSON.parse(fs.readFileSync(new URL('../bootstrap/manifests/source-migrations.v1.json', import.meta.url), 'utf8'));
  assert.deepEqual(verifyFitnessPr108ReplayGate({ config: generatorConfig, gate: replayGate, sourceManifest }), []);
  const packageDrift = structuredClone(sourceManifest);
  packageDrift.migrations.pop();
  assert.notEqual(verifyFitnessPr108ReplayGate({ config: generatorConfig, gate: replayGate, sourceManifest: packageDrift }).length, 0, '15 accepted package drift');

  const generatedSqlPaths = fs.readdirSync(new URL('../bootstrap/artifacts/inert-sql/', import.meta.url))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => `bootstrap/artifacts/inert-sql/${name}`);
  assert.deepEqual(verifyGeneratedArtifactPathBoundary(generatedSqlPaths), []);
  assert.notEqual(verifyGeneratedArtifactPathBoundary([...generatedSqlPaths, 'bootstrap/artifacts/inert-sql/unexpected.sql']).length, 0, '15 generated SQL drift');
  assert.equal(gateCases.length + 1, 15);
});

test('portable bootstrap identity inspection rejects quoted and nested keys, project-ref-shaped values, and malformed inputs without throwing', () => {
  const leakedIdentity = ['bxtcuhkotumitoqtr', 'cej'].join('');
  const shapedIdentity = ['abcdefghijklmnop', 'qrst'].join('');
  const safe = {
    action_time_expected_state_binding: {
      status: 'REQUIRED',
      identity_binding: 'ACTION_TIME_ONLY',
      source_artifact_contains_identity: false
    },
    evidence_digest: 'a'.repeat(64)
  };

  assert.deepEqual(inspectPortableBootstrapIdentity('safe.json', JSON.stringify(safe)), []);
  for (const fixture of [
    JSON.stringify({ project_ref: 'UNKNOWN' }),
    JSON.stringify({ nested: { project_ref: 'UNKNOWN' } }),
    JSON.stringify({ value: leakedIdentity }),
    JSON.stringify({ value: shapedIdentity }),
    JSON.stringify({ value: `case ${leakedIdentity} failed` }),
    JSON.stringify({ supabase_url: 'UNKNOWN' })
  ]) {
    assert.doesNotThrow(() => inspectPortableBootstrapIdentity('fixture.json', fixture));
    assert.notEqual(inspectPortableBootstrapIdentity('fixture.json', fixture).length, 0);
  }
  for (const malformed of ['{', '', null, { value: leakedIdentity }]) {
    assert.doesNotThrow(() => inspectPortableBootstrapIdentity('fixture.json', malformed));
    assert.notEqual(inspectPortableBootstrapIdentity('fixture.json', malformed).length, 0);
  }
});

test('effective function ACL verifier rejects missing, unmatched, extra, and explicit privilege reintroduction', () => {
  const expected = ['fitness.example(uuid)'];
  const expectedCounts = { 'fitness.example(uuid)': 1 };
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const exact = 'revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;';
  const filename = '00000000000002_fitness_schema_inert.sql';
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, `${marker}${definition}\n${exact}\n`, expected, expectedCounts), []);
  for (const sql of [
    `${marker}${definition}\n`,
    `${marker}revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;\n${definition}\n`,
    `${marker}${definition}\nrevoke execute on function fitness.example(uuid) from anon, authenticated, service_role;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on function fitness.example(uuid) to authenticated;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on all functions in schema fitness to authenticated;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on function fitness.example(uuid) to undeclared_role;\n`,
    `${marker}${definition}\n${exact}\ngrant execute on all routines in schema fitness to authenticated;\n`
  ]) {
    assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, expected, expectedCounts).length, 0, sql);
  }
  assert.notEqual(
    verifyEffectiveFunctionAcls(filename, `${marker}${definition}\ncreate or replace function fitness.example(target_id uuid) returns void language sql as $$ select 2 $$;\n${exact}\n`, expected, expectedCounts).length,
    0
  );
});

test('effective function ACL verifier respects ordered schema and default privilege settlement', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const expected = ['fitness.example(uuid)'];
  const counts = { 'fitness.example(uuid)': 1 };
  const schemaSettled = `${marker}${definition}
    grant execute on all functions in schema fitness to authenticated;
    revoke all privileges on all functions in schema fitness from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, schemaSettled, expected, counts), []);

  const defaultSettled = `${marker}
    alter default privileges in schema fitness grant execute on functions to authenticated;
    ${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, defaultSettled, expected, counts), []);

  const defaultExposed = `${marker}
    alter default privileges in schema fitness grant execute on functions to authenticated;
    ${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC;
  `;
  assert.notEqual(verifyEffectiveFunctionAcls(filename, defaultExposed, expected, counts).length, 0);

  const laterSettled = `${marker}${definition}
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
    grant execute on function fitness.example(uuid) to authenticated;
    revoke execute on function fitness.example(uuid) from authenticated;
  `;
  assert.deepEqual(verifyEffectiveFunctionAcls(filename, laterSettled, expected, counts), []);
});

test('effective function ACL verifier preserves overload and mixed OR REPLACE identities', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const sql = `${marker}
    CrEaTe FuNcTiOn fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;
    CREATE FUNCTION fitness.example(label text) returns void language sql as $$ select 1 $$;
    cReAtE OR\n RePlAcE FUNCTION fitness.example(target_id uuid) returns void language sql as $$ select 2 $$;
    revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
    revoke execute on function fitness.example(text) from PUBLIC, anon, authenticated, service_role;
  `;
  assert.deepEqual(
    verifyEffectiveFunctionAcls(
      filename,
      sql,
      ['fitness.example(text)', 'fitness.example(uuid)'],
      { 'fitness.example(text)': 1, 'fitness.example(uuid)': 2 }
    ),
    []
  );
});

test('effective function ACL verifier fails closed on malformed and owner-dependent privileges', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const definition = 'create function fitness.example(target_id uuid) returns void language sql as $$ select 1 $$;';
  const expected = ['fitness.example(uuid)'];
  const counts = { 'fitness.example(uuid)': 1 };
  for (const statement of [
    'grant execute on all functions in schema ;',
    'alter default privileges for role owner in schema fitness grant execute on functions to authenticated;',
    'grant execute on all routines in schema fitness to authenticated;',
    'revoke execute on function fitness.example(table%type) from PUBLIC;'
  ]) {
    const sql = `${marker}${definition}
      revoke execute on function fitness.example(uuid) from PUBLIC, anon, authenticated, service_role;
      ${statement}
    `;
    assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, expected, counts).length, 0, statement);
  }
});

test('a newly added function is rejected even when explicitly revoked', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const sql = `${marker}
    create function fitness.undeclared() returns void language sql as $$ select 1 $$;
    revoke execute on function fitness.undeclared() from PUBLIC, anon, authenticated, service_role;
  `;
  assert.notEqual(verifyEffectiveFunctionAcls(filename, sql, [], {}).length, 0);
});

test('Fitness function search_path verification freezes final effective paths and the function denominator', () => {
  const filename = '00000000000002_fitness_schema_inert.sql';
  const contract = {
    version: 'test-v1',
    source_file: filename,
    effective_search_path: ['fitness', 'pg_temp'],
    functions: ['fitness.example(uuid)']
  };
  const definition = (clause, replace = false, name = 'example') => `
    create ${replace ? 'or replace ' : ''}function fitness.${name}(target_id uuid)
    returns void language plpgsql
    ${clause}
    as $$ begin null; end; $$;
  `;
  const initial = definition('', false);
  const settled = definition('set search_path = fitness, pg_temp', true);
  assert.deepEqual(verifyGeneratedFitnessFunctionSearchPaths(filename, `${marker}${initial}\n${settled}`, contract), []);

  for (const clause of [
    '',
    'set search_path = public, pg_temp',
    'set search_path = pg_temp, fitness',
    'set search_path = fitness, pg_temp, extensions',
    'set search_path to fitness, pg_temp',
    'set search_path = fitness, pg_temp set search_path = fitness, pg_temp'
  ]) {
    const failures = verifyGeneratedFitnessFunctionSearchPaths(filename, `${marker}${definition(clause)}`, contract);
    assert.notEqual(failures.length, 0, clause || 'missing');
  }

  const withFutureFunction = `${marker}
    ${definition('set search_path = fitness, pg_temp')}
    ${definition('set search_path = fitness, pg_temp', false, 'future_extra')}
  `;
  assert.match(verifyGeneratedFitnessFunctionSearchPaths(filename, withFutureFunction, contract).join('\n'), /denominator drift/);
});
