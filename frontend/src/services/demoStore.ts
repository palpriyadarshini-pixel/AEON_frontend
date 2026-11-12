
const STORAGE_KEY = 'aeon_demo_database_v1';

export interface DemoDatabase {
  agents: Record<string, unknown>[];
  policies: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  reservations: Record<string, unknown>[];
  purchases: Record<string, unknown>[];
  approvals: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  auditEvents: Record<string, unknown>[];
}


function createEmptyDatabase(): DemoDatabase {
  const now = new Date().toISOString();

  const agent1 = 'demo-agent-procurement';
  const agent2 = 'demo-agent-operations';

  const policy1 = 'demo-policy-standard';
  const policy2 = 'demo-policy-restricted';

  const budget1 = 'demo-budget-procurement';
  const budget2 = 'demo-budget-operations';

  return {
    agents: [
      {
        id: agent1,
        organization_id: 'demo-org-001',
        assigned_policy_id: policy1,
        name: 'Procurement Agent',
        description: 'Handles approved office and technology procurement.',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: agent2,
        organization_id: 'demo-org-001',
        assigned_policy_id: policy2,
        name: 'Operations Agent',
        description: 'Handles routine operational purchases.',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],

    policies: [
      {
        id: policy1,
        organization_id: 'demo-org-001',
        name: 'Standard Procurement Policy',
        description: 'Standard purchasing controls for the procurement agent.',
        is_active: true,
        current_version: 1,
        created_at: now,
        updated_at: now,
        versions: [
          {
            id: 'demo-version-standard',
            policy_id: policy1,
            version: 1,
            max_amount_per_transaction: '1000.00',
            max_amount_per_day: '5000.00',
            approval_threshold_amount: '500.00',
            allowed_suppliers: ['Dell', 'HP', 'Amazon Business'],
            allowed_currencies: ['USD'],
            created_at: now,
          },
        ],
      },
      {
        id: policy2,
        organization_id: 'demo-org-001',
        name: 'Restricted Operations Policy',
        description: 'Lower spending limits for operational purchases.',
        is_active: true,
        current_version: 1,
        created_at: now,
        updated_at: now,
        versions: [
          {
            id: 'demo-version-restricted',
            policy_id: policy2,
            version: 1,
            max_amount_per_transaction: '250.00',
            max_amount_per_day: '1000.00',
            approval_threshold_amount: '150.00',
            allowed_suppliers: ['Amazon Business', 'Staples'],
            allowed_currencies: ['USD'],
            created_at: now,
          },
        ],
      },
    ],

    budgets: [
      {
        id: budget1,
        organization_id: 'demo-org-001',
        agent_id: agent1,
        name: 'Procurement Operating Budget',
        currency: 'USD',
        allocated_amount: '5000.00',
        reserved_amount: '0.00',
        spent_amount: '1250.00',
        available_amount: '3750.00',
        start_date: now,
        end_date: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: budget2,
        organization_id: 'demo-org-001',
        agent_id: agent2,
        name: 'Operations Operating Budget',
        currency: 'USD',
        allocated_amount: '2000.00',
        reserved_amount: '0.00',
        spent_amount: '400.00',
        available_amount: '1600.00',
        start_date: now,
        end_date: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],

    reservations: [],

    purchases: [
      {
        id: 'demo-purchase-001',
        organization_id: 'demo-org-001',
        agent_id: agent1,
        item_description: 'Business laptops',
        category: 'Technology',
        max_budget: '1200.00',
        currency: 'USD',
        requirements: { quantity: 2 },
        status: 'COMPLETED',
        fulfillment_status: 'DELIVERED',
        selected_quote_id: 'demo-quote-001',
        quotes: [
          {
            id: 'demo-quote-001',
            purchase_request_id: 'demo-purchase-001',
            supplier_id: 'demo-supplier-001',
            supplier_name: 'Dell',
            item_id: 'laptop-business',
            unit_price: '625.00',
            quantity: 2,
            total_amount: '1250.00',
            currency: 'USD',
            estimated_delivery_days: 5,
            expires_at: null,
            is_valid: true,
            created_at: now,
          },
        ],
        recommendation: {
          id: 'demo-recommendation-001',
          provider_type: 'demo-engine',
          recommended_quote_id: 'demo-quote-001',
          reasoning: 'Best match for the configured supplier and procurement criteria.',
          comparison_scores: {},
          created_at: now,
        },
        policy_decision: {
          allowed: false,
          requires_approval: true,
          reason_codes: ['APPROVAL_THRESHOLD_EXCEEDED'],
          policy_id: policy1,
          policy_version: 1,
          approved_max_amount: '1000.00',
          currency: 'USD',
        },
        created_at: now,
        updated_at: now,
      },
      {
        id: 'demo-purchase-002',
        organization_id: 'demo-org-001',
        agent_id: agent2,
        item_description: 'Office supplies',
        category: 'Office',
        max_budget: '180.00',
        currency: 'USD',
        requirements: { quantity: 1 },
        status: 'REQUIRES_APPROVAL',
        fulfillment_status: 'NOT_STARTED',
        selected_quote_id: null,
        quotes: [],
        recommendation: null,
        policy_decision: {
          allowed: false,
          requires_approval: true,
          reason_codes: ['HUMAN_APPROVAL_REQUIRED'],
          policy_id: policy2,
          policy_version: 1,
          approved_max_amount: '150.00',
          currency: 'USD',
        },
        created_at: now,
        updated_at: now,
      },
    ],

    approvals: [
      {
        id: 'demo-approval-001',
        purchase_request_id: 'demo-purchase-002',
        selected_quote_id: null,
        amount: '180.00',
        currency: 'USD',
        policy_version: 1,
        expires_at: null,
        approver_id: null,
        status: 'PENDING',
        notes: null,
        decided_at: null,
        created_at: now,
        updated_at: now,
      },
    ],

    payments: [],
    transactions: [],

    auditEvents: [
      {
        id: 'demo-audit-001',
        organization_id: 'demo-org-001',
        actor_type: 'SYSTEM',
        actor_id: null,
        action: 'DEMO_DATA_INITIALIZED',
        entity_type: 'ORGANIZATION',
        entity_id: 'demo-org-001',
        metadata_json: {
          source: 'AEON demo environment',
          simulated: true,
        },
        created_at: now,
      },
    ],
  };
}

export function getDemoDatabase(): DemoDatabase {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const initialDatabase = createEmptyDatabase();
    saveDemoDatabase(initialDatabase);
    return initialDatabase;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<DemoDatabase>;
    const empty = createEmptyDatabase();

    return {
      agents: parsed.agents ?? empty.agents,
      policies: parsed.policies ?? empty.policies,
      budgets: parsed.budgets ?? empty.budgets,
      reservations: parsed.reservations ?? empty.reservations,
      purchases: parsed.purchases ?? empty.purchases,
      approvals: parsed.approvals ?? empty.approvals,
      payments: parsed.payments ?? empty.payments,
      transactions: parsed.transactions ?? empty.transactions,
      auditEvents: parsed.auditEvents ?? empty.auditEvents,
    };
  } catch {
    return createEmptyDatabase();
  }
}

export function saveDemoDatabase(database: DemoDatabase): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

export function updateDemoDatabase(
  updater: (database: DemoDatabase) => DemoDatabase,
): DemoDatabase {
  const current = getDemoDatabase();
  const updated = updater(current);

  saveDemoDatabase(updated);

  return updated;
}

export function resetDemoDatabase(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createDemoId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createDemoTimestamp(): string {
  return new Date().toISOString();
}
