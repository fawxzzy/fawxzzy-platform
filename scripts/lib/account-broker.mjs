import { types } from 'node:util';

export const accountBrokerContractPath = 'contracts/v1/auth/account-broker-contract.json';

const exactClients = Object.freeze([
  Object.freeze({ client_id: 'fawxzzy_web', origin: 'https://fawxzzy.com', callback_path: '/auth/callback', default_return_path: '/account' }),
  Object.freeze({ client_id: 'fitness', origin: 'https://fitness.fawxzzy.com', callback_path: '/auth/callback', default_return_path: '/account' }),
  Object.freeze({ client_id: 'mazer', origin: 'https://mazer.fawxzzy.com', callback_path: '/auth/callback', default_return_path: '/account' })
]);

const exactActivationGates = Object.freeze([
  Object.freeze({ gate: 'wave4_complete_postimage', status: 'REQUIRED' }),
  Object.freeze({ gate: 'account_shell_exact_head_review', status: 'REQUIRED' }),
  Object.freeze({ gate: 'platform_private_exchange_schema_review', status: 'REQUIRED' }),
  Object.freeze({ gate: 'exact_auth_url_provider_preimage', status: 'REQUIRED' }),
  Object.freeze({ gate: 'captcha_configuration_and_synthetic_proof', status: 'REQUIRED' }),
  Object.freeze({ gate: 'synthetic_preview_exchange_proof', status: 'BLOCKED' }),
  Object.freeze({ gate: 'source_token_rejection_proof', status: 'BLOCKED' }),
  Object.freeze({ gate: 'rollback_proof', status: 'BLOCKED' }),
  Object.freeze({ gate: 'serial_product_adapter_cutover', status: 'BLOCKED' })
]);

const exactNegativeProbes = Object.freeze([
  'UNKNOWN_CLIENT_REJECTED',
  'UNLISTED_RETURN_REJECTED',
  'STATE_MISMATCH_REJECTED',
  'PKCE_MISMATCH_REJECTED',
  'PKCE_METHOD_DOWNGRADE_REJECTED',
  'EXPIRED_CODE_REJECTED',
  'REPLAYED_CODE_REJECTED',
  'WRONG_CLIENT_REJECTED',
  'WRONG_REDIRECT_REJECTED',
  'IDENTIFIER_NON_ENUMERATION_REJECTED',
  'PENDING_EXCHANGE_AFTER_ACCOUNT_WIDE_REVOCATION_REJECTED',
  'SOURCE_TOKEN_REJECTED',
  'URL_TOKEN_REJECTED',
  'PROVIDER_ERROR_NON_ECHOING'
]);

const exactContextChanges = Object.freeze([
  'product_title',
  'product_theme',
  'return_destination',
  'policy_supplement_links'
]);

const exactContextMustNotChange = Object.freeze([
  'credential_validation',
  'username_rules',
  'session_security',
  'reset_flow',
  'message_vocabulary'
]);

const exactSurfaces = Object.freeze([
  Object.freeze({ surface: 'sign_in', path: '/sign-in' }),
  Object.freeze({ surface: 'create_account', path: '/create-account' }),
  Object.freeze({ surface: 'account', path: '/account' }),
  Object.freeze({ surface: 'reset_password', path: '/reset-password' }),
  Object.freeze({ surface: 'new_password', path: '/new-password' })
]);

const exactRequiredFunctions = Object.freeze([
  Object.freeze({
    name: 'platform_private.issue_account_session_exchange',
    exposure: 'server_only',
    subject_source: 'verified_account_session',
    execute_grants: Object.freeze([])
  }),
  Object.freeze({
    name: 'platform_private.consume_account_session_exchange',
    exposure: 'server_only',
    subject_source: 'stored_exchange_record',
    execute_grants: Object.freeze([])
  })
]);

const exactPositiveProbes = Object.freeze([
  'ACCOUNT_SESSION_TO_WEB_SESSION',
  'ACCOUNT_SESSION_TO_FITNESS_SESSION',
  'ACCOUNT_SESSION_TO_MAZER_SESSION',
  'USERNAME_EMAIL_CANONICAL_IDENTITY_RESOLUTION',
  'ATOMIC_USERNAME_CLAIM_NO_DUPLICATE_IDENTITY',
  'ATOMIC_GLOBAL_PROFILE_USER_NUMBER_ALLOCATION',
  'FAILED_REDEMPTION_PRESERVES_EXCHANGE',
  'RESET_TO_NEW_PASSWORD_TO_RETURN_CONTEXT',
  'PER_ORIGIN_SIGN_OUT',
  'ACCOUNT_WIDE_REVOCATION'
]);

function canonicalDigest(value) {
  return JSON.stringify(value);
}

export function validateAccountBrokerContract(contract) {
  const failures = [];
  const requireCondition = (condition, message) => {
    if (!condition) failures.push(message);
  };

  try {
    if (
      !contract ||
      typeof contract !== 'object' ||
      Array.isArray(contract) ||
      types.isProxy(contract) ||
      Object.getPrototypeOf(contract) !== Object.prototype
    ) {
      return ['account broker contract representation is not canonical'];
    }

    const lifecycle = contract.lifecycle ?? {};
    const architecture = contract.architecture ?? {};
    const template = contract.account_template ?? {};
    const username = contract.identifier_policy?.username ?? {};
    const start = contract.start_request ?? {};
    const exchange = contract.exchange ?? {};
    const recovery = contract.recovery ?? {};
    const signOut = contract.sign_out ?? {};
    const database = contract.database_contract ?? {};
    const relation = database.relation ?? {};
    const privacy = contract.privacy_and_errors ?? {};

    requireCondition(contract.version === '1.0.0' && contract.status === 'REQUIRED', 'account broker version or source status changed');
    requireCondition(contract.ownership?.contract_repository === 'fawxzzy/fawxzzy-platform' && contract.ownership?.account_surface_repository === 'fawxzzy/FawxzzyWeb', 'account broker repository ownership changed');
    requireCondition(architecture.account_origin === 'https://account.fawxzzy.com' && architecture.target_project_ref === 'bxtcuhkotumitoqtrcej', 'account broker origin or target project changed');
    requireCondition(architecture.session_scope === 'per_origin' && architecture.exchange_mechanism === 'one_time_backend_exchange_with_pkce_s256', 'per-origin PKCE broker mechanism changed');
    requireCondition(architecture.shared_refresh_cookies === false && architecture.source_project_fallback === false && architecture.source_only_contract === true, 'shared-cookie, source-fallback, or source-only boundary regressed');
    requireCondition(lifecycle.source_contract === 'CURRENT' && lifecycle.runtime_implementation === 'REQUIRED', 'account broker source lifecycle changed');
    requireCondition(lifecycle.provider_application === 'BLOCKED' && lifecycle.preview_activation === 'BLOCKED' && lifecycle.production_activation === 'BLOCKED' && lifecycle.apply_admitted === false, 'account broker provider or activation lifecycle must remain blocked');
    requireCondition(canonicalDigest(contract.clients) === canonicalDigest(exactClients), 'account broker exact client registry changed');
    requireCondition(template.single_template_per_surface === true && template.context_source === 'validated_client_registry' && template.context_is_authorization === false, 'account template must remain single-source, registry-bound, and non-authorizing');
    requireCondition(canonicalDigest(template.contexts) === canonicalDigest(['fawxzzy_web', 'fitness', 'mazer']), 'account template context denominator changed');
    requireCondition(canonicalDigest(template.context_changes) === canonicalDigest(exactContextChanges), 'account template context-change denominator changed');
    requireCondition(canonicalDigest(template.context_must_not_change) === canonicalDigest(exactContextMustNotChange), 'account template invariant denominator changed');
    requireCondition(canonicalDigest(template.surfaces) === canonicalDigest(exactSurfaces), 'account template surface/path mapping changed');
    requireCondition(contract.identifier_policy?.sign_in_identifier === 'email_or_canonical_username', 'sign-in identifier must remain email or canonical username');
    requireCondition(canonicalDigest(contract.identifier_policy?.sign_up_required_fields) === canonicalDigest(['email', 'username', 'password']), 'sign-up required fields changed');
    requireCondition(username.minimum_characters === 2 && username.maximum_characters === 15 && username.ascii_pattern === '^[A-Za-z0-9._-]{2,15}$', 'canonical username syntax changed');
    requireCondition(username.availability_is_advisory === true && username.atomic_server_claim_required === true && username.username_only_identity_matching_forbidden === true, 'username claim or identity boundary weakened');
    requireCondition(contract.identifier_policy?.username_resolution === 'server_only_non_disclosing', 'username resolution must remain server-only and non-disclosing');
    requireCondition(start.endpoint === '/auth/start' && start.method === 'GET' && start.pkce_method === 'S256', 'account broker start endpoint or PKCE method changed');
    requireCondition(start.state_entropy_bits_minimum >= 128 && start.arbitrary_return_urls_allowed === false && start.redirect_validation === 'exact_client_origin_and_path_allowlist', 'state entropy or return URL validation weakened');
    requireCondition(exchange.issue_endpoint === '/api/account-broker/exchanges' && exchange.redeem_endpoint === '/api/account-broker/exchanges/redeem' && exchange.method === 'POST', 'account broker exchange endpoint changed');
    requireCondition(exchange.authorization_code_entropy_bits_minimum >= 256 && exchange.authorization_code_ttl_seconds <= 60 && exchange.authorization_code_ttl_seconds > 0, 'authorization code entropy or lifetime weakened');
    requireCondition(exchange.authorization_code_storage === 'sha256_digest_only' && exchange.session_material_storage === 'ephemeral_server_side_encrypted_only' && exchange.session_material_transport === 'server_to_server_response_only', 'authorization code or session material handling weakened');
    requireCondition(exchange.consume === 'atomic_exactly_once' && exchange.failed_consume_effect === 'none' && exchange.account_wide_revocation_effect === 'reject_pending_exchange', 'account exchange atomic consumption or revocation boundary changed');
    requireCondition(exchange.url_session_material_allowed === false && exchange.receipt_contains_session_material === false, 'session material must remain absent from URLs and receipts');
    requireCondition(recovery.owner_origin === 'https://account.fawxzzy.com' && recovery.request_path === '/reset-password' && recovery.redirect_path === '/reset-password?recovery=1' && recovery.new_password_path === '/new-password' && recovery.pkce_required === true && recovery.url_tokens_allowed === false, 'central recovery route, PKCE, or URL-token boundary changed');
    requireCondition(signOut.product_action === 'clear_current_origin_session' && signOut.silent_cross_origin_cookie_deletion === false && signOut.user_confirmation_for_all_sessions === true, 'sign-out scope or confirmation boundary changed');
    requireCondition(database.executable_sql_included === false && relation.name === 'platform_private.account_session_exchanges', 'broker database contract must remain source-only and private');
    requireCondition(relation.data_api_exposed === false && relation.rls_enabled === true && relation.rls_forced === true && relation.plaintext_code_stored === false && relation.plaintext_session_material_stored === false, 'broker private relation exposure, RLS, or plaintext boundary weakened');
    requireCondition(canonicalDigest(database.required_functions) === canonicalDigest(exactRequiredFunctions), 'broker function name, subject, order, or grant contract changed');
    requireCondition(privacy.provider_error_text_echoed === false && privacy.identifier_existence_disclosed === false && privacy.authorization_code_logged === false && privacy.session_material_logged === false, 'account broker privacy or non-echo boundary weakened');
    requireCondition(canonicalDigest(contract.activation_gates) === canonicalDigest(exactActivationGates), 'account broker activation gate order or status changed');
    requireCondition(contract.verification?.synthetic_users_only === true && canonicalDigest(contract.verification?.required_negative_probes) === canonicalDigest(exactNegativeProbes), 'account broker synthetic-only negative-proof denominator changed');
    requireCondition(canonicalDigest(contract.verification?.required_positive_probes) === canonicalDigest(exactPositiveProbes), 'account broker positive-proof denominator changed');
  } catch {
    failures.push('account broker contract validation failed categorically');
  }

  return failures.sort((left, right) => left.localeCompare(right));
}
