
export type NavigationTab =
  | 'overview'
  | 'agents'
  | 'procurement'
  | 'approvals'
  | 'budgets'
  | 'policies'
  | 'transactions'
  | 'audit';

export type UserRole = 'ADMIN' | 'APPROVER' | 'MEMBER';

export type PurchaseStatus =
  | 'REQUESTED'
  | 'QUOTING'
  | 'RECOMMENDED'
  | 'BLOCKED'
  | 'REQUIRES_APPROVAL'
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'COMPLETED';

export type FulfillmentStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'DELIVERED'
  | 'FAILED';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export type PaymentStatus =
  | 'NOT_STARTED'
  | 'ORDER_CREATED'
  | 'BUYER_APPROVAL_PENDING'
  | 'CAPTURE_PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type TransactionStatus =
  | 'PENDING'
  | 'SETTLED'
  | 'FAILED'
  | 'REFUNDED';

export type TransactionType = 'PURCHASE' | 'REFUND' | 'REVERSAL';

export type ReservationStatus = 'ACTIVE' | 'SETTLED' | 'RELEASED';

export type ActorType = 'USER' | 'AGENT' | 'SYSTEM' | 'WEBHOOK' | string;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface CurrentUserResponse {
  user: UserResponse;
  organization: OrganizationResponse;
  role: UserRole;
}

/**
 * OpenAPI does not define the response schemas for health endpoints.
 * Keep this intentionally permissive until runtime responses are verified.
 */
export interface ServiceHealthResponse {
  status?: string;
  app?: string;
  environment?: string;
  service?: string;
  version?: string;
  uptimeSeconds?: number;
  uptime_seconds?: number;
  timestamp?: string;
  database?: string;
  [key: string]: unknown;
}

export interface AgentResponse {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentCredentialResponse {
  id: string;
  agent_id: string;
  key_prefix: string;
  is_revoked: boolean;
  revoked_at: string | null;
  created_at: string;
}

export interface AgentKeyGenerateResponse {
  credential_id: string;
  agent_id: string;
  raw_api_key: string;
  key_prefix: string;
  created_at: string;
}

export interface AgentCreatedWithKeyResponse {
  agent: AgentResponse;
  credentials: AgentKeyGenerateResponse;
}

export interface AgentSummaryResponse {
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

/** UI-normalized agent model assembled from agent, budget, summary and policy APIs. */
export interface AgentRecord {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  budget: number;
  remaining_budget: number;
  spent_amount: number;
  reserved_amount: number;
  currency: string;
  allowed_vendors: string[];
  assigned_policy_name?: string | null;
}

export interface BudgetResponse {
  id: string;
  organization_id: string;
  agent_id: string | null;
  name: string;
  currency: string;
  allocated_amount: string;
  reserved_amount: string;
  spent_amount: string;
  available_amount: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetReservationResponse {
  id: string;
  budget_id: string;
  purchase_request_id: string;
  amount: string;
  currency: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface PolicyVersionResponse {
  id: string;
  policy_id: string;
  version: number;
  max_amount_per_transaction: string;
  max_amount_per_day: string;
  approval_threshold_amount: string;
  allowed_suppliers: string[];
  allowed_currencies: string[];
  created_at: string;
}

export interface PolicyResponse {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  current_version: number;
  created_at: string;
  updated_at: string;
  versions?: PolicyVersionResponse[];
}

export interface PolicyDecision {
  allowed: boolean;
  requires_approval: boolean;
  reason_codes: string[];
  policy_id?: string | null;
  policy_version?: number | null;
  approved_max_amount?: string | null;
  currency: string;
}

export interface PolicyAssignmentResponse {
  id: string;
  agent_id: string;
  policy_id: string;
  is_active: boolean;
  created_at: string;
}

export interface SupplierQuote {
  id: string;
  purchase_request_id: string;
  supplier_id: string;
  supplier_name: string;
  item_id: string;
  unit_price: string;
  quantity: number;
  total_amount: string;
  currency: string;
  estimated_delivery_days: number;
  expires_at: string | null;
  is_valid: boolean;
  created_at: string;
}

export interface RecommendationDetailResponse {
  id: string;
  provider_type: string;
  recommended_quote_id: string;
  reasoning: string;
  comparison_scores: Record<string, unknown>;
  created_at: string;
}

export interface PurchaseDetailResponse {
  id: string;
  organization_id: string;
  agent_id: string;
  item_description: string;
  category: string;
  max_budget: string;
  currency: string;
  requirements: Record<string, unknown>;
  status: PurchaseStatus;
  fulfillment_status: FulfillmentStatus;
  selected_quote_id: string | null;
  quotes: SupplierQuote[];
  recommendation: RecommendationDetailResponse | null;
  policy_decision: PolicyDecision | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseListResponse {
  id: string;
  agent_id: string;
  item_description: string;
  category: string;
  max_budget: string;
  currency: string;
  status: PurchaseStatus;
  fulfillment_status: FulfillmentStatus;
  selected_quote_id: string | null;
  created_at: string;
}

export interface Recommendation {
  recommended_vendor: string;
  price: number;
  rationale: string[];
  source: string;
}

/** UI-facing result. decision is the backend purchase lifecycle status. */
export interface PurchaseResult {
  id: string;
  status: PurchaseStatus;
  decision: PurchaseStatus;
  message: string;
  audit_reason?: string;
  transaction: {
    id: string;
    status: PurchaseStatus;
    amount: number;
    vendor: string;
    human_approved?: boolean;
    paypal_order_id?: string;
  };
  quotes: Array<{
    id: string;
    provider: string;
    price: number;
    currency: string;
    delivery_latency_hours: number;
    reliability_rating?: number | null;
  }>;
  recommendation: Recommendation | null;
  policy_decision: PolicyDecision | null;
  selected_quote_id: string | null;
}

export interface ApprovalResponse {
  id: string;
  purchase_request_id: string;
  selected_quote_id: string | null;
  amount: string;
  currency: string;
  policy_version: number | null;
  expires_at: string | null;
  approver_id: string | null;
  status: ApprovalStatus;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalDetailResponse extends ApprovalResponse {
  item_description: string | null;
  category: string | null;
  supplier_name: string | null;
  is_expired: boolean;
}

export interface PaymentOrderCreateResponse {
  payment_attempt_id: string;
  purchase_request_id: string;
  provider_order_id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  approval_url: string | null;
  created_at: string;
}

export interface PaymentCaptureResponse {
  payment_attempt_id: string;
  purchase_request_id: string;
  provider_capture_id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  transaction_id: string | null;
  completed_at: string | null;
}

export interface PaymentStatusResponse {
  id: string;
  purchase_request_id: string;
  provider: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  approval_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAttemptSummary {
  id: string;
  provider: string;
  status: string;
  provider_order_id: string | null;
  provider_capture_id: string | null;
  approval_url: string | null;
}

export interface TransactionResponse {
  id: string;
  organization_id: string;
  purchase_request_id: string;
  budget_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: string;
  provider_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseSummaryForTransaction {
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

export interface TransactionDetailResponse extends TransactionResponse {
  purchase_request: PurchaseSummaryForTransaction | null;
  payment_attempt: PaymentAttemptSummary | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LedgerTransaction {
  id: string;
  purchase_request_id: string;
  agent_id: string;
  agent_name: string;
  vendor: string;
  item_description: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  transaction_type: TransactionType;
  policy_decision: PurchaseStatus | 'UNKNOWN';
  reason?: string | null;
  created_at: string;
  remaining_budget: number | null;
  paypal_order_id?: string;
  paypal_capture_id?: string;
}

export interface LedgerSummary {
  total: number;
  pending: number;
  blocked: number;
  completed: number;
  failed: number;
  completed_amount: number;
}

export interface LedgerResponse {
  status: string;
  count: number;
  data: LedgerTransaction[];
  summary: LedgerSummary;
}

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  action: string;
  actor_type: string;
  actor_id: string | null;
  description: string;
  metadata_json?: Record<string, unknown>;
}

export interface TransactionTimelineResponse {
  transaction_id: string;
  purchase_request_id: string;
  events: TimelineEventItem[];
}

export interface TransactionReceiptResponse {
  receipt_number: string;
  issued_at: string;
  transaction_id: string;
  organization_id: string;
  organization_name: string;
  purchase_request_id: string;
  agent_id: string;
  agent_name: string;
  item_description: string;
  category: string;
  supplier_name: string;
  quantity: number;
  unit_price: string;
  total_amount: string;
  currency: string;
  status: TransactionStatus;
  payment_method: string;
  provider_capture_id: string | null;
  provider_order_id: string | null;
  policy_name: string | null;
}

export interface AuditEventResponse {
  id: string;
  organization_id: string | null;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

/** UI audit row preserves the generic entity and actor identities. */
export interface AuditEvent {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardStatsResponse {
  total_agents: number;
  active_agents: number;
  total_budget_allocated: string;
  total_budget_spent: string;
  total_budget_reserved: string;
  total_budget_available: string;
  pending_approvals_count: number;
  total_purchases_count: number;
  completed_purchases_count: number;
  currency: string;
}

export interface RecentActivityItem {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface DashboardOverviewResponse {
  stats: DashboardStatsResponse;
  recent_activities: RecentActivityItem[];
}

export interface AgentSpendingItem {
  agent_id: string;
  agent_name: string;
  total_spent: string;
  purchase_count: number;
}

export interface SpendingSummaryResponse {
  total_spent: string;
  total_refunded: string;
  net_spent: string;
  currency: string;
  by_category: Record<string, string>;
  by_supplier: Record<string, string>;
  by_agent: AgentSpendingItem[];
}

export interface ReconciliationResponse {
  total_transactions_count: number;
  total_spent_amount: string;
  total_refunded_amount: string;
  currency: string;
  pending_count: number;
  settled_count: number;
  failed_count: number;
  reconciled_at: string;
}
