import { API_MODE, API_BASE_URL } from './config';
import { mockRequest } from './mockTransport';
import type {
  PurchaseStatus,
  AgentRecord,
  AgentResponse,
  AgentCreatedWithKeyResponse,
  AgentSummaryResponse,
  AgentCredentialResponse,
  AgentKeyGenerateResponse,
  AuditEvent,
  AuditEventResponse,
  ApprovalResponse,
  ApprovalDetailResponse,
  BudgetResponse,
  BudgetReservationResponse,
  CurrentUserResponse,
  DashboardOverviewResponse,
  DashboardStatsResponse,
  LedgerResponse,
  LedgerSummary,
  LedgerTransaction,
  PaymentCaptureResponse,
  PaymentOrderCreateResponse,
  PaymentStatusResponse,
  PolicyResponse,
  PolicyVersionResponse,
  PurchaseDetailResponse,
  PurchaseResult,
  ServiceHealthResponse,
  SpendingSummaryResponse,
  TransactionDetailResponse,
  TransactionTimelineResponse,
  TransactionReceiptResponse,
  PaginatedResponse,
  TransactionResponse,
  TransactionStatus,
  TransactionType,
  ApprovalStatus,
  ReconciliationResponse,
} from '../types';

const API_PREFIX = '/api/v1';
const TOKEN_KEY = 'aeon_admin_access_token';
const AGENT_KEY_PREFIX = 'aeon_agent_api_key:';

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */
const PURCHASE_STATUSES: PurchaseStatus[] = [
  'REQUESTED',
  'QUOTING',
  'RECOMMENDED',
  'BLOCKED',
  'REQUIRES_APPROVAL',
  'AUTHORIZED',
  'CANCELLED',
  'COMPLETED',
];

function normalizePurchaseStatus(
  value: unknown,
): PurchaseStatus | 'UNKNOWN' {
  if (
    typeof value === 'string' &&
    PURCHASE_STATUSES.includes(value as PurchaseStatus)
  ) {
    return value as PurchaseStatus;
  }

  return 'UNKNOWN';
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(AGENT_KEY_PREFIX))
    .forEach((key) => sessionStorage.removeItem(key));
}

function agentKey(agentId: string): string | null {
  const existing = sessionStorage.getItem(`${AGENT_KEY_PREFIX}${agentId}`);
  if (existing) return existing;

  if (API_MODE === 'demo') {
    if (agentId === 'demo-agent-procurement') {
      const demoKey = 'aeon_demo_procurement_key';
      sessionStorage.setItem(`${AGENT_KEY_PREFIX}${agentId}`, demoKey);
      return demoKey;
    }
    if (agentId === 'demo-agent-operations') {
      const demoKey = 'aeon_demo_operations_key';
      sessionStorage.setItem(`${AGENT_KEY_PREFIX}${agentId}`, demoKey);
      return demoKey;
    }
  }

  return null;
}

export function getAgentApiKey(agentId: string): string | null {
  return agentKey(agentId);
}

export function setAgentApiKey(agentId: string, apiKey: string): void {
  sessionStorage.setItem(`${AGENT_KEY_PREFIX}${agentId}`, apiKey.trim());
}

export function hasAgentApiKey(agentId: string): boolean {
  return Boolean(agentKey(agentId));
}

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: {
    agentApiKey?: string;
    auth?: boolean;
  } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const token = getAccessToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (options.agentApiKey) {
    headers.set('X-Agent-API-Key', options.agentApiKey);
  }

  if (API_MODE === 'demo') {
    return mockRequest<T>(path, {
      ...init,
      headers,
    });
  }

  const target = path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path}`;

  const response = await fetch(target, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';

  const payload: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const body = payload as {
      detail?: unknown;
      message?: string;
      error?: {
        message?: string;
        details?: unknown;
      };
    } | null;

    const detail =
      typeof body?.detail === 'string'
        ? body.detail
        : body?.detail
          ? JSON.stringify(body.detail)
          : undefined;

    const message =
      body?.error?.message ??
      detail ??
      body?.message ??
      `${response.status} ${response.statusText}`;

    const extra = body?.error?.details
      ? ` (${JSON.stringify(body.error.details)})`
      : '';

    throw new ApiError(
      `${message}${extra}`,
      response.status,
      payload,
    );
  }

  if (response.status === 204 || payload === '') {
    return undefined as T;
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/*                              RAW API MODELS                                */
/* -------------------------------------------------------------------------- */

interface RawAgentSummary {
  agent_id: string;
  name: string;
  is_active: boolean;
  assigned_policy_name: string | null;
  assigned_budget_allocated: string | null;
  assigned_budget_spent: string | null;
  total_purchases_requested: number;
  total_purchases_approved: number;
  total_purchases_completed: number;
  total_spent: string;
  currency?: string;
  created_at: string;
}

interface RawPurchaseList {
  id: string;
  agent_id: string;
  item_description: string;
  category: string;
  max_budget: string;
  currency: string;
  status: string;
  fulfillment_status: string;
  selected_quote_id: string | null;
  created_at: string;
}

interface RawPurchaseForTransaction {
  id: string;
  item_description: string;
  category: string;
  status: string;
  fulfillment_status: string;
  agent_id: string;
  agent_name: string;
  supplier_name: string | null;
  unit_price: string | null;
  quantity: number | null;
}

interface RawPaymentAttemptForTransaction {
  id: string;
  provider: string;
  status: string;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  approval_url: string | null;
}

interface RawTransactionDetail extends TransactionResponse {
  purchase_request: RawPurchaseForTransaction | null;
  payment_attempt: RawPaymentAttemptForTransaction | null;
}

/* -------------------------------------------------------------------------- */
/*                                AUTHENTICATION                              */
/* -------------------------------------------------------------------------- */

export async function fetchHealth(): Promise<ServiceHealthResponse> {
  return request<ServiceHealthResponse>(
    '/health',
    {},
    { auth: false },
  );
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
}> {
  return request(
    `${API_PREFIX}/auth/login`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

export async function registerAdmin(payload: {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}): Promise<{
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
}> {
  return request(
    `${API_PREFIX}/auth/register`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { auth: false },
  );
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>(
    `${API_PREFIX}/auth/me`,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  AGENTS                                    */
/* -------------------------------------------------------------------------- */


export async function fetchAgents(): Promise<AgentRecord[]> {
  const [agents, budgets, summaries, policies] = await Promise.all([
    request<AgentResponse[]>(`${API_PREFIX}/agents?skip=0&limit=100`),
    request<BudgetResponse[]>(`${API_PREFIX}/budgets`),
    request<RawAgentSummary[]>(`${API_PREFIX}/dashboard/agents`),
    request<PolicyResponse[]>(`${API_PREFIX}/policies`),
  ]);

  return agents.map((agent) => {
    const summary = summaries.find(
      (item) => item.agent_id === agent.id,
    );

    // Backend selects the newest active agent budget.
    // If none exists, it falls back to the newest active
    // organization-wide budget.
    const activeBudgets = budgets
      .filter((budget) => budget.is_active)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      );

    const agentBudget = activeBudgets.find(
      (budget) => budget.agent_id === agent.id,
    );

    const organizationBudget = activeBudgets.find(
      (budget) => budget.agent_id == null,
    );

    const effectiveBudget = agentBudget ?? organizationBudget;

    const assignedPolicy = policies.find(
      (policy) => policy.name === summary?.assigned_policy_name,
    );

    const latestVersion = assignedPolicy?.versions
      ?.slice()
      .sort((a, b) => b.version - a.version)[0];

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      is_active: agent.is_active,
      created_at: agent.created_at,

      budget: effectiveBudget
        ? num(effectiveBudget.allocated_amount)
        : 0,

      remaining_budget: effectiveBudget
        ? num(effectiveBudget.available_amount)
        : 0,

      spent_amount: effectiveBudget
        ? num(effectiveBudget.spent_amount)
        : 0,

      reserved_amount: effectiveBudget
        ? num(effectiveBudget.reserved_amount)
        : 0,

      currency: effectiveBudget?.currency ?? 'USD',

      allowed_vendors:
        latestVersion?.allowed_suppliers ?? [],

      assigned_policy_name:
        summary?.assigned_policy_name ?? null,
    };
  });
}



export async function createAgent(payload: {
  name: string;
  budget: number;
  allowed_vendors: string[];
  max_single_purchase?: number;
  approval_threshold?: number;
}): Promise<AgentRecord & { raw_api_key: string }> {
  if (payload.name.trim().length < 2) {
    throw new Error('Agent name must contain at least 2 characters.');
  }

  if (!Number.isFinite(payload.budget) || payload.budget <= 0) {
    throw new Error('Agent budget must be greater than zero.');
  }

  if (
    payload.max_single_purchase !== undefined &&
    (payload.max_single_purchase <= 0 ||
      payload.max_single_purchase > payload.budget)
  ) {
    throw new Error(
      'Maximum single purchase must be positive and cannot exceed the total budget.',
    );
  }

  // Default automatic approval threshold: $5.00 USD.
  const approvalThreshold = payload.approval_threshold ?? 5;

  if (
    !Number.isFinite(approvalThreshold) ||
    approvalThreshold < 0
  ) {
    throw new Error(
      'Approval threshold must be zero or greater.',
    );
  }

  const created = await request<AgentCreatedWithKeyResponse>(
    `${API_PREFIX}/agents`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name.trim(),
        description: 'Provisioned from AEON procurement dashboard',
      }),
    },
  );

  const agentId = created.agent.id;
  const key = created.credentials.raw_api_key;

  // The backend exposes the raw key only once.
  // Retain it only in this browser session.
  sessionStorage.setItem(
    `${AGENT_KEY_PREFIX}${agentId}`,
    key,
  );

  try {
    const policy = await request<PolicyResponse>(
      `${API_PREFIX}/policies`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `${payload.name} Procurement Policy`,
          description: `Budget and supplier controls for ${payload.name}`,
          max_amount_per_transaction: String(
            payload.max_single_purchase ?? payload.budget,
          ),
          max_amount_per_day: String(payload.budget),
          approval_threshold_amount: String(approvalThreshold),
          allowed_suppliers: payload.allowed_vendors,
          allowed_currencies: ['USD'],
        }),
      },
    );

    await request(
      `${API_PREFIX}/policies/assignments/${encodeURIComponent(agentId)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          policy_id: policy.id,
        }),
      },
    );

    await request<BudgetResponse>(
      `${API_PREFIX}/budgets`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `${payload.name} Operating Budget`,
          allocated_amount: String(payload.budget),
          currency: 'USD',
          agent_id: agentId,
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `Agent ${agentId} was created and its one-time API key is saved in this browser session, but policy or budget provisioning failed. Preserve the key and complete the remaining setup. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }

  const rows = await fetchAgents();
  const agent = rows.find((row) => row.id === agentId);

  if (!agent) {
    throw new Error(
      'Agent provisioning completed, but the agent was not returned by the listing endpoint.',
    );
  }

  return {
    ...agent,
    raw_api_key: key,
  };
}


export async function updateAgent(
  agentId: string,
  payload: {
    name?: string | null;
    description?: string | null;
    is_active?: boolean | null;
  },
): Promise<AgentResponse> {
  return request<AgentResponse>(
    `${API_PREFIX}/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function rotateAgentKey(
  agentId: string,
): Promise<AgentKeyGenerateResponse> {
  const result = await request<AgentKeyGenerateResponse>(
    `${API_PREFIX}/agents/${encodeURIComponent(agentId)}/keys/rotate`,
    { method: 'POST' },
  );

  sessionStorage.setItem(
    `${AGENT_KEY_PREFIX}${agentId}`,
    result.raw_api_key,
  );

  return result;
}

export async function fetchAgentCredentials(
  agentId: string,
): Promise<AgentCredentialResponse[]> {
  return request<AgentCredentialResponse[]>(
    `${API_PREFIX}/agents/${encodeURIComponent(agentId)}/keys`,
  );
}

export async function revokeAgentCredential(
  agentId: string,
  credentialId: string,
): Promise<AgentCredentialResponse> {
  return request<AgentCredentialResponse>(
    `${API_PREFIX}/agents/${encodeURIComponent(agentId)}/keys/${encodeURIComponent(credentialId)}`,
    { method: 'DELETE' },
  );
}

/* -------------------------------------------------------------------------- */
/*                                   POLICIES                                 */
/* -------------------------------------------------------------------------- */

export async function fetchPolicies(): Promise<PolicyResponse[]> {
  return request<PolicyResponse[]>(
    `${API_PREFIX}/policies`,
  );
}

export async function fetchPolicy(
  policyId: string,
): Promise<PolicyResponse> {
  return request<PolicyResponse>(
    `${API_PREFIX}/policies/${encodeURIComponent(policyId)}`,
  );
}

export async function createPolicyVersion(
  policyId: string,
  payload: {
    max_amount_per_transaction: number | string;
    max_amount_per_day: number | string;
    approval_threshold_amount: number | string;
    allowed_suppliers?: string[];
    allowed_currencies?: string[];
  },
): Promise<PolicyVersionResponse> {
  return request<PolicyVersionResponse>(
    `${API_PREFIX}/policies/${encodeURIComponent(policyId)}/versions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}


export async function assignPolicy(
  agentId: string,
  policyId: string,
) {
  const currentAssignment = await request<{
    id: string;
    agent_id: string;
    policy_id: string;
    is_active: boolean;
  } | null>(
    `${API_PREFIX}/policies/assignments/${encodeURIComponent(agentId)}`,
  );

  if (
    currentAssignment?.is_active &&
    currentAssignment.policy_id !== policyId
  ) {
    throw new Error(
      'This agent already has an active policy. The current backend does not provide an endpoint to deactivate or replace an assignment.',
    );
  }

  return request(
    `${API_PREFIX}/policies/assignments/${encodeURIComponent(agentId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ policy_id: policyId }),
    },
  );
}


/* -------------------------------------------------------------------------- */
/*                                   BUDGETS                                  */
/* -------------------------------------------------------------------------- */

export async function fetchBudgets(): Promise<BudgetResponse[]> {
  return request<BudgetResponse[]>(
    `${API_PREFIX}/budgets`,
  );
}

export async function createBudget(payload: {
  name: string;
  allocated_amount: number | string;
  currency?: string;
  agent_id?: string | null;
}): Promise<BudgetResponse> {
  return request<BudgetResponse>(
    `${API_PREFIX}/budgets`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateBudget(
  budgetId: string,
  payload: {
    name?: string | null;
    allocated_amount?: number | string | null;
    is_active?: boolean | null;
    end_date?: string | null;
  },
): Promise<BudgetResponse> {
  return request<BudgetResponse>(
    `${API_PREFIX}/budgets/${encodeURIComponent(budgetId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchBudgetReservations(
  budgetId: string,
): Promise<BudgetReservationResponse[]> {
  return request<BudgetReservationResponse[]>(
    `${API_PREFIX}/budgets/${encodeURIComponent(budgetId)}/reservations`,
  );
}

export async function settleBudgetReservation(
  reservationId: string,
): Promise<BudgetReservationResponse> {
  return request<BudgetReservationResponse>(
    `${API_PREFIX}/budgets/reservations/${encodeURIComponent(reservationId)}/settle`,
    { method: 'POST' },
  );
}

export async function releaseBudgetReservation(
  reservationId: string,
): Promise<BudgetReservationResponse> {
  return request<BudgetReservationResponse>(
    `${API_PREFIX}/budgets/reservations/${encodeURIComponent(reservationId)}/release`,
    { method: 'POST' },
  );
}

/* -------------------------------------------------------------------------- */
/*                                  PROCUREMENT                               */
/* -------------------------------------------------------------------------- */

export async function submitPurchase(payload: {
  agent_id: string;
  amount: number;
  item_description: string;
  category: string;
}): Promise<PurchaseResult> {
  const key = agentKey(payload.agent_id);

  if (!key) {
    throw new Error(
      'No API key is stored for this agent in the current browser session. Use "Generate / Rotate Key" or paste the agent API key.',
    );
  }

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
    throw new Error('Purchase amount must be greater than zero.');
  }

  const raw = await request<PurchaseDetailResponse>(
    `${API_PREFIX}/purchases`,
    {
      method: 'POST',
      body: JSON.stringify({
        item_description: payload.item_description,
        category: payload.category,
        max_budget: payload.amount.toFixed(2),
        currency: 'USD',
        requirements: {
          quantity: 1,
          source: 'AEON dashboard',
        },
      }),
    },
    {
      // OpenAPI declares HTTPBearer security and an optional
      // X-Agent-API-Key header. Send both.
      agentApiKey: key,
    },
  );
  const quotes = Array.isArray(raw.quotes)
  ? raw.quotes
  : [];

  const selectedQuote = raw.selected_quote_id
    ? quotes.find(
        (quote) => quote.id === raw.selected_quote_id,
      )
    : undefined;

  const reasonCodes =
    raw.policy_decision?.reason_codes ?? [];

  let decision: PurchaseResult['decision'];

  switch (raw.status) {
    case 'AUTHORIZED':
      decision = 'AUTHORIZED';
      break;

    case 'REQUIRES_APPROVAL':
      decision = 'REQUIRES_APPROVAL';
      break;

    case 'BLOCKED':
      decision = 'BLOCKED';
      break;

    default:
      throw new Error(
        `Purchase ${raw.id} has status "${raw.status}". It is not authorized for checkout.`,
      );
  }

  const recommendedQuote = raw.recommendation
    ? quotes.find(
        (quote) =>
          quote.id === raw.recommendation?.recommended_quote_id,
      )
    : undefined;

  const recommendation = raw.recommendation
    ? {
        recommended_vendor:
          recommendedQuote?.supplier_name ??
          'Recommendation quote unavailable',
        price: num(recommendedQuote?.total_amount),
        rationale: [raw.recommendation.reasoning],
        source: raw.recommendation.provider_type,
      }
    : {
        recommended_vendor: 'No recommendation available',
        price: 0,
        rationale: [],
        source: 'backend',
      };

    return {
    id: raw.id,
    status: raw.status,
    decision,
    message:
      decision === 'BLOCKED'
        ? `Blocked by deterministic policy: ${
            reasonCodes.join(', ') || 'policy violation'
          }`
        : decision === 'REQUIRES_APPROVAL'
          ? 'This purchase requires an authorized human approval.'
          : decision === 'AUTHORIZED'
            ? 'The backend authorized this purchase. PayPal checkout may now be initiated.'
            : `Purchase status: ${decision}`,
    audit_reason:
      decision === 'BLOCKED'
        ? reasonCodes.join(', ')
        : undefined,
    transaction: {
      id: raw.id,
      status: raw.status,
      amount: num(raw.max_budget),
      vendor: selectedQuote?.supplier_name ?? 'No supplier selected',
    },
    quotes: quotes.map((quote) => ({
      id: quote.id,
      provider: quote.supplier_name,
      price: num(quote.total_amount),
      currency: quote.currency,
      delivery_latency_hours:
        quote.estimated_delivery_days * 24,
      reliability_rating: null,
    })),
    recommendation,
    policy_decision: raw.policy_decision ?? null,
    selected_quote_id: raw.selected_quote_id ?? null,
  };
}

export async function fetchPurchases(
  filters: {
    skip?: number;
    limit?: number;
    status?: string;
  } = {},
): Promise<RawPurchaseList[]> {
  const params = new URLSearchParams({
    skip: String(filters.skip ?? 0),
    limit: String(filters.limit ?? 50),
  });

  if (filters.status) {
    params.set('status', filters.status);
  }

  return request<RawPurchaseList[]>(
    `${API_PREFIX}/purchases?${params.toString()}`,
  );
}

export async function fetchPurchase(
  purchaseId: string,
): Promise<PurchaseDetailResponse> {
  return request<PurchaseDetailResponse>(
    `${API_PREFIX}/purchases/${encodeURIComponent(purchaseId)}`,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  APPROVALS                                 */
/* -------------------------------------------------------------------------- */

export async function fetchApprovals(
  status?: ApprovalStatus,
): Promise<ApprovalResponse[]> {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();

  return request<ApprovalResponse[]>(
    `${API_PREFIX}/approvals${query ? `?${query}` : ''}`,
  );
}

export async function fetchApproval(
  approvalId: string,
): Promise<ApprovalDetailResponse> {
  return request<ApprovalDetailResponse>(
    `${API_PREFIX}/approvals/${encodeURIComponent(approvalId)}`,
  );
}

export async function approvePurchase(
  purchaseRequestId: string,
): Promise<ApprovalResponse> {
  const approvals = await fetchApprovals('PENDING');

  const approval = approvals.find(
    (item) =>
      item.purchase_request_id === purchaseRequestId,
  );

  if (!approval) {
    throw new Error(
      'No pending approval exists for this purchase. Refresh the approval queue and verify its status.',
    );
  }

  return request<ApprovalResponse>(
    `${API_PREFIX}/approvals/${encodeURIComponent(approval.id)}/decide`,
    {
      method: 'POST',
      body: JSON.stringify({
        decision: 'APPROVE',
        notes: 'Approved by an authorized dashboard operator.',
      }),
    },
  );
}

export async function decideApproval(
  approvalId: string,
  decision: 'APPROVE' | 'REJECT',
  notes?: string,
): Promise<ApprovalResponse> {
  return request<ApprovalResponse>(
    `${API_PREFIX}/approvals/${encodeURIComponent(approvalId)}/decide`,
    {
      method: 'POST',
      body: JSON.stringify({
        decision,
        notes,
      }),
    },
  );
}

/* -------------------------------------------------------------------------- */
/*                              PAYPAL PAYMENTS                               */
/* -------------------------------------------------------------------------- */

export async function createPayPalOrder(
  purchaseRequestId: string,
): Promise<{
  orderID: string;
  approvalUrl: string;
  paymentAttemptId: string;
}> {
  const result = await request<PaymentOrderCreateResponse>(
    `${API_PREFIX}/payments/create-order`,
    {
      method: 'POST',
      body: JSON.stringify({
        purchase_request_id: purchaseRequestId,
      }),
    },
  );

  if (!result.approval_url) {
    throw new Error(
      'PayPal order was created, but no approval URL was returned.',
    );
  }

  return {
    orderID: result.provider_order_id,
    approvalUrl: result.approval_url,
    paymentAttemptId: result.payment_attempt_id,
  };
}

export async function capturePayPalOrder(
  providerOrderId: string,
): Promise<PaymentCaptureResponse> {
  return request<PaymentCaptureResponse>(
    `${API_PREFIX}/payments/capture`,
    {
      method: 'POST',
      body: JSON.stringify({
        provider_order_id: providerOrderId,
      }),
    },
  );
}

export async function fetchPayPalStatus(
  providerOrderId: string,
): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(
    `${API_PREFIX}/payments/${encodeURIComponent(providerOrderId)}`,
  );
}

export async function reconcilePayPalOrder(
  providerOrderId: string,
): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(
    `${API_PREFIX}/payments/${encodeURIComponent(providerOrderId)}/reconcile`,
    { method: 'POST' },
  );
}

export async function reconcilePendingPayments(): Promise<ReconciliationResponse> {
  return request<ReconciliationResponse>(
    `${API_PREFIX}/payments/reconcile`,
    { method: 'POST' },
  );
}

/* -------------------------------------------------------------------------- */
/*                                TRANSACTIONS                                */
/* -------------------------------------------------------------------------- */

export interface TransactionFilters {
  page?: number;
  page_size?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  purchase_request_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export async function fetchTransactionPage(
  filters: TransactionFilters = {},
): Promise<PaginatedResponse<TransactionResponse>> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(
      Math.min(filters.page_size ?? 20, 100),
    ),
    sort_by: filters.sort_by ?? 'created_at',
    sort_order: filters.sort_order ?? 'desc',
  });

  if (filters.type) {
    params.set('type', filters.type);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.purchase_request_id) {
    params.set(
      'purchase_request_id',
      filters.purchase_request_id,
    );
  }

  if (filters.start_date) {
    params.set('start_date', filters.start_date);
  }

  if (filters.end_date) {
    params.set('end_date', filters.end_date);
  }

  return request<PaginatedResponse<TransactionResponse>>(
    `${API_PREFIX}/transactions?${params.toString()}`,
  );
}

export async function fetchTransactionDetail(
  transactionId: string,
): Promise<TransactionDetailResponse> {
  return request<TransactionDetailResponse>(
    `${API_PREFIX}/transactions/${encodeURIComponent(transactionId)}`,
  );
}

export async function fetchTransactionTimeline(
  transactionId: string,
): Promise<TransactionTimelineResponse> {
  return request<TransactionTimelineResponse>(
    `${API_PREFIX}/transactions/${encodeURIComponent(transactionId)}/timeline`,
  );
}

export async function fetchTransactionReceipt(
  transactionId: string,
): Promise<TransactionReceiptResponse> {
  return request<TransactionReceiptResponse>(
    `${API_PREFIX}/transactions/${encodeURIComponent(transactionId)}/receipt`,
  );
}

/**
 * Compatibility function for the existing TransactionLedger.
 *
 * The API does not support agent_id or free-text search filters on
 * GET /transactions. Those filters are applied to the returned page only.
 */
export async function fetchTransactions(
  filters: {
    status?: string;
    agent_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  } = {},
): Promise<LedgerResponse> {
  const validStatuses: TransactionStatus[] = [
    'PENDING',
    'SETTLED',
    'FAILED',
    'REFUNDED',
  ];

  const status =
    filters.status &&
    filters.status !== 'ALL' &&
    validStatuses.includes(filters.status as TransactionStatus)
      ? (filters.status as TransactionStatus)
      : undefined;

  const page = await fetchTransactionPage({
    page: filters.page ?? 1,
    page_size: filters.page_size ?? 20,
    status,
  });

  const [details, budgets] = await Promise.all([
    Promise.all(
      page.items.map((item) =>
        fetchTransactionDetail(item.id),
      ),
    ),
    fetchBudgets(),
  ]);

  const rows: LedgerTransaction[] = details.map((item) => {
    const purchase = item.purchase_request;

    const activeBudgets = budgets.filter(
      (budget) =>
        budget.agent_id === purchase?.agent_id &&
        budget.is_active,
    );

    const remainingBudget =
      activeBudgets.length > 0
        ? activeBudgets.reduce(
            (sum, budget) =>
              sum + num(budget.available_amount),
            0,
          )
        : null;

    return {
      id: item.id,
      purchase_request_id: item.purchase_request_id,
      agent_id: purchase?.agent_id ?? '',
      agent_name: purchase?.agent_name ?? 'Unknown agent',
      vendor: purchase?.supplier_name ?? '—',
      item_description: purchase?.item_description ?? '—',
      amount: num(item.amount),
      currency: item.currency,
      status: item.status,
      transaction_type: item.type,
      policy_decision: normalizePurchaseStatus(purchase?.status),
      reason: null,
      created_at: item.created_at,
      remaining_budget: remainingBudget,
      paypal_order_id:
        item.payment_attempt?.provider_order_id ?? undefined,
      paypal_capture_id:
        item.payment_attempt?.provider_capture_id ??
        item.provider_transaction_id ??
        undefined,
    };
  });

  const search = filters.search?.trim().toLowerCase();

  const data = rows.filter((row) => {
    const matchesAgent =
      !filters.agent_id ||
      filters.agent_id === 'ALL' ||
      row.agent_id === filters.agent_id;

    const matchesSearch =
      !search ||
      [
        row.agent_name,
        row.vendor,
        row.item_description,
        row.status,
        row.id,
        row.purchase_request_id,
        row.paypal_order_id,
        row.paypal_capture_id,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(search),
      );

    return matchesAgent && matchesSearch;
  });

  // These are current-page figures, not organization-wide totals.
  const summary: LedgerSummary = {
    total: page.total,
    pending: rows.filter(
      (row) => row.status === 'PENDING',
    ).length,
    blocked: 0,
    completed: rows.filter(
      (row) => row.status === 'SETTLED',
    ).length,
    failed: rows.filter(
      (row) => row.status === 'FAILED',
    ).length,
    completed_amount: rows
      .filter((row) => row.status === 'SETTLED')
      .reduce((sum, row) => sum + row.amount, 0),
  };

  return {
    status: 'success',
    count: page.total,
    data,
    summary,
  };
}

/* -------------------------------------------------------------------------- */
/*                              RECONCILIATION                                */
/* -------------------------------------------------------------------------- */

export async function fetchReconciliationSummary(): Promise<ReconciliationResponse> {
  return request<ReconciliationResponse>(
    `${API_PREFIX}/transactions/reconcile`,
  );
}

/* -------------------------------------------------------------------------- */
/*                                  AUDIT                                     */
/* -------------------------------------------------------------------------- */

export interface AuditFilters {
  page?: number;
  page_size?: number;
  actor_type?: string;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export async function fetchAuditPage(
  filters: AuditFilters = {},
): Promise<PaginatedResponse<AuditEventResponse>> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(
      Math.min(filters.page_size ?? 50, 100),
    ),
    sort_by: filters.sort_by ?? 'created_at',
    sort_order: filters.sort_order ?? 'desc',
  });

  const optionalFilters: Array<
    [string, string | undefined]
  > = [
    ['actor_type', filters.actor_type],
    ['actor_id', filters.actor_id],
    ['action', filters.action],
    ['entity_type', filters.entity_type],
    ['entity_id', filters.entity_id],
    ['start_date', filters.start_date],
    ['end_date', filters.end_date],
  ];

  optionalFilters.forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return request<PaginatedResponse<AuditEventResponse>>(
    `${API_PREFIX}/audit?${params.toString()}`,
  );
}

export async function fetchAuditEvents(): Promise<{
  status: string;
  count: number;
  data: AuditEvent[];
}> {
  const result = await fetchAuditPage({
    page: 1,
    page_size: 50,
  });

  return {
    status: 'success',
    count: result.total,
    data: result.items.map((event) => ({
      id: event.id,
      actor_type: event.actor_type,
      actor_id: event.actor_id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      metadata_json: event.metadata_json,
      timestamp: event.created_at,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                                  DASHBOARD                                 */
/* -------------------------------------------------------------------------- */

export async function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  return request<DashboardStatsResponse>(
    `${API_PREFIX}/dashboard/stats`,
  );
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
  return request<DashboardOverviewResponse>(
    `${API_PREFIX}/dashboard/overview`,
  );
}

export async function fetchSpendingSummary(): Promise<SpendingSummaryResponse> {
  return request<SpendingSummaryResponse>(
    `${API_PREFIX}/dashboard/spending`,
  );
}

/* -------------------------------------------------------------------------- */
/*                              TYPE RE-EXPORTS                               */
/* -------------------------------------------------------------------------- */

export type {
  AgentRecord,
  AuditEvent,
  BudgetResponse,
  BudgetReservationResponse,
  LedgerResponse,
  LedgerSummary,
  LedgerTransaction,
  PurchaseResult,
  ServiceHealthResponse,
} from '../types';
