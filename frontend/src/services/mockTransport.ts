import {
  createDemoId,
  createDemoTimestamp,
  getDemoDatabase,
  updateDemoDatabase,
} from './demoStore';
const DEMO_USER_KEY = 'aeon_demo_current_user';

interface DemoUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface DemoOrganization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface DemoCurrentUser {
  user: DemoUser;
  organization: DemoOrganization;
  role: 'ADMIN';
}

const demoOrganization: DemoOrganization = {
  id: 'demo-org-001',
  name: 'AEON Demo Organization',
  slug: 'aeon-demo',
  created_at: new Date().toISOString(),
};

function createDemoUser(
  email = 'admin@aeon.demo',
  fullName = 'Demo Administrator',
): DemoCurrentUser {
  return {
    user: {
      id: 'demo-user-001',
      email,
      full_name: fullName,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    organization: demoOrganization,
    role: 'ADMIN',
  };
}

function saveDemoUser(user: DemoCurrentUser): void {
  sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
}

function getDemoUser(): DemoCurrentUser {
  const saved = sessionStorage.getItem(DEMO_USER_KEY);

  if (saved) {
    try {
      return JSON.parse(saved) as DemoCurrentUser;
    } catch {
      sessionStorage.removeItem(DEMO_USER_KEY);
    }
  }

  return createDemoUser();
}

function readBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== 'string') {
    return {};
  }

  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Demo transport for AEON.
 * All responses are simulated locally.
 * No real payment or financial operations are performed.
 */
export async function mockRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://aeon.local');
  const pathname = url.pathname;
  const body = readBody(init);

  // Service health
  if (method === 'GET' && pathname === '/health') {
    return {
      status: 'healthy',
      app: 'AEON',
      service: 'demo',
      environment: 'demo',
      database: 'simulated',
      timestamp: new Date().toISOString(),
    } as T;
  }

  // Demo login
  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    const email = String(body.email ?? '').trim();

    if (!email || !body.password) {
      throw new Error('Enter an email address and password.');
    }

    const user = createDemoUser(email);
    saveDemoUser(user);

    return {
      access_token: 'aeon-demo-session-token',
      token_type: 'bearer',
      expires_in_minutes: 480,
    } as T;
  }

  // Demo registration
  if (method === 'POST' && pathname === '/api/v1/auth/register') {
    const email = String(body.email ?? '').trim();
    const fullName = String(body.full_name ?? '').trim();
    const organizationName = String(
      body.organization_name ?? '',
    ).trim();

    if (!email || !body.password || !fullName || !organizationName) {
      throw new Error('Complete all registration fields.');
    }

    const user = createDemoUser(email, fullName);
    user.organization.name = organizationName;
    user.organization.slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    saveDemoUser(user);

    return {
      access_token: 'aeon-demo-session-token',
      token_type: 'bearer',
      expires_in_minutes: 480,
    } as T;
  }

  // Current demo user
  if (method === 'GET' && pathname === '/api/v1/auth/me') {
    return getDemoUser() as T;
  }


  // Load persisted demo records
  const database = getDemoDatabase();

  // Agents
  if (method === 'GET' && pathname === '/api/v1/agents') {
    return database.agents as T;
  }

  // Budgets
  if (method === 'GET' && pathname === '/api/v1/budgets') {
    return database.budgets as T;
  }

  // Policies
  if (method === 'GET' && pathname === '/api/v1/policies') {
    return database.policies as T;
  }

  // Agent dashboard summaries
  if (method === 'GET' && pathname === '/api/v1/dashboard/agents') {
    const summaries = database.agents.map((agent) => {
      const agentId = String(agent.id);

      const agentBudgets = database.budgets.filter(
        (budget) => budget.agent_id === agentId && budget.is_active,
      );

      const allocated = agentBudgets.reduce(
        (sum, budget) => sum + Number(budget.allocated_amount ?? 0),
        0,
      );

      const spent = agentBudgets.reduce(
        (sum, budget) => sum + Number(budget.spent_amount ?? 0),
        0,
      );

      const assignedPolicy = database.policies.find(
        (policy) => policy.id === agent.assigned_policy_id,
        );

      const purchases = database.purchases.filter(
        (purchase) => purchase.agent_id === agentId,
      );

      return {
        agent_id: agentId,
        name: agent.name,
        is_active: agent.is_active,
        assigned_policy_name: assignedPolicy?.name ?? null,
        assigned_budget_allocated: allocated.toFixed(2),
        assigned_budget_spent: spent.toFixed(2),
        total_purchases_requested: purchases.length,
        total_purchases_approved: purchases.filter(
          (purchase) =>
            purchase.status === 'AUTHORIZED' ||
            purchase.status === 'COMPLETED',
        ).length,
        total_purchases_completed: purchases.filter(
          (purchase) => purchase.status === 'COMPLETED',
        ).length,
        total_spent: spent.toFixed(2),
        currency: 'USD',
        created_at: agent.created_at,
      };
    });

    return summaries as T;
  }


// Dashboard overview
if (method === 'GET' && pathname === '/api/v1/dashboard/overview') {
  const totalAllocated = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.allocated_amount ?? 0),
    0,
  );

  const totalSpent = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.spent_amount ?? 0),
    0,
  );

  const totalReserved = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.reserved_amount ?? 0),
    0,
  );

  const totalAvailable = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.available_amount ?? 0),
    0,
  );

  const stats = {
    total_agents: database.agents.length,
    active_agents: database.agents.filter(
      (agent) => agent.is_active === true,
    ).length,
    total_budget_allocated: totalAllocated.toFixed(2),
    total_budget_spent: totalSpent.toFixed(2),
    total_budget_reserved: totalReserved.toFixed(2),
    total_budget_available: totalAvailable.toFixed(2),
    pending_approvals_count: database.approvals.filter(
      (approval) => approval.status === 'PENDING',
    ).length,
    total_purchases_count: database.purchases.length,
    completed_purchases_count: database.purchases.filter(
      (purchase) => purchase.status === 'COMPLETED',
    ).length,
    currency: 'USD',
  };

  const recentActivities = database.auditEvents
    .map((event) => ({
      id: String(event.id ?? ''),
      actor_type: String(event.actor_type ?? 'SYSTEM'),
      actor_id: (event.actor_id ?? null) as string | null,
      action: String(event.action ?? 'UNKNOWN'),
      entity_type: String(
        event.entity_type ?? event.resource_type ?? 'UNKNOWN',
      ),
      entity_id: (event.entity_id ?? event.resource_id ?? null) as
        string | null,
      metadata_json: (event.metadata_json ?? {}) as Record<
        string,
        unknown
      >,
      created_at: String(event.created_at ?? ''),
    }))
    .sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at),
    )
    .slice(0, 8);

  return {
    stats,
    recent_activities: recentActivities,
  } as T;
}

// Dashboard statistics
if (method === 'GET' && pathname === '/api/v1/dashboard/stats') {
  const totalAllocated = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.allocated_amount ?? 0),
    0,
  );

  const totalSpent = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.spent_amount ?? 0),
    0,
  );

  const totalReserved = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.reserved_amount ?? 0),
    0,
  );

  const totalAvailable = database.budgets.reduce(
    (sum, budget) =>
      sum + Number(budget.available_amount ?? 0),
    0,
  );

  return {
    total_agents: database.agents.length,

    active_agents: database.agents.filter(
      (agent) => agent.is_active === true,
    ).length,

    total_budget_allocated: totalAllocated.toFixed(2),
    total_budget_spent: totalSpent.toFixed(2),
    total_budget_reserved: totalReserved.toFixed(2),
    total_budget_available: totalAvailable.toFixed(2),

    pending_approvals_count: database.approvals.filter(
      (approval) => approval.status === 'PENDING',
    ).length,

    total_purchases_count: database.purchases.length,

    completed_purchases_count: database.purchases.filter(
      (purchase) => purchase.status === 'COMPLETED',
    ).length,

    currency: 'USD',
  } as T;
}

  // Create agent
  if (method === 'POST' && pathname === '/api/v1/agents') {
    const now = createDemoTimestamp();
    const agentId = createDemoId('agent');
    const credentialId = createDemoId('credential');
    const rawApiKey = `aeon_demo_${crypto.randomUUID()}`;

    const credentials = JSON.parse(
  localStorage.getItem('aeon_demo_credentials_v1') || '[]',
) as Record<string, unknown>[];

credentials.push({
  id: credentialId,
  agent_id: agentId,
  key_prefix: rawApiKey.slice(0, 16),
  api_key: rawApiKey,
  is_revoked: false,
  revoked_at: null,
  created_at: now,
});

localStorage.setItem(
  'aeon_demo_credentials_v1',
  JSON.stringify(credentials),
);

    const agent = {
      id: agentId,
      organization_id: 'demo-org-001',
      name: String(body.name ?? 'New Agent'),
      description: String(body.description ?? ''),
      is_active: true,
      created_at: now,
      updated_at: now,
      assigned_policy_id: null,
      assigned_policy_name: null,
    };

    updateDemoDatabase((db) => ({
      ...db,
      agents: [...db.agents, agent],
      auditEvents: [
        ...db.auditEvents,
        {
          id: createDemoId('audit'),
          organization_id: 'demo-org-001',
          actor_type: 'USER',
          actor_id: 'demo-user-001',
          action: 'AGENT_CREATED',
          entity_type: 'AGENT',
          entity_id: agentId,
          metadata_json: { name: agent.name, simulated: true },
          created_at: now,
        },
      ],
    }));



    return {
      agent,
      credentials: {
        credential_id: credentialId,
        agent_id: agentId,
        raw_api_key: rawApiKey,
        key_prefix: rawApiKey.slice(0, 16),
        created_at: now,
      },
    } as T;
  }

  // Create policy
  if (method === 'POST' && pathname === '/api/v1/policies') {
    const now = createDemoTimestamp();
    const policyId = createDemoId('policy');
    const versionId = createDemoId('policy-version');

    const policy = {
      id: policyId,
      organization_id: 'demo-org-001',
      name: String(body.name ?? 'New Procurement Policy'),
      description: String(body.description ?? ''),
      is_active: true,
      current_version: 1,
      created_at: now,
      updated_at: now,
      versions: [
        {
          id: versionId,
          policy_id: policyId,
          version: 1,
          max_amount_per_transaction: String(
            body.max_amount_per_transaction ?? '1000.00',
          ),
          max_amount_per_day: String(
            body.max_amount_per_day ?? '5000.00',
          ),
          approval_threshold_amount: String(
            body.approval_threshold_amount ?? '500.00',
          ),
          allowed_suppliers: Array.isArray(body.allowed_suppliers)
            ? body.allowed_suppliers
            : [],
          allowed_currencies: Array.isArray(body.allowed_currencies)
            ? body.allowed_currencies
            : ['USD'],
          created_at: now,
        },
      ],
    };

    updateDemoDatabase((db) => ({
      ...db,
      policies: [...db.policies, policy],
    }));

    return policy as T;
  }

  // Assign policy to agent
  if (
    method === 'POST' &&
    pathname.startsWith('/api/v1/policies/assignments/')
  ) {
    const agentId = decodeURIComponent(
      pathname.split('/').pop() ?? '',
    );
    const policyId = String(body.policy_id ?? '');

    const db = getDemoDatabase();
    const policy = db.policies.find((item) => item.id === policyId);

    if (!policy) {
      throw new Error('Policy not found.');
    }

    let assignedAgent: Record<string, unknown> | undefined;

    updateDemoDatabase((current) => ({
      ...current,
      agents: current.agents.map((agent) => {
        if (agent.id !== agentId) return agent;

        assignedAgent = {
          ...agent,
          assigned_policy_id: policyId,
          assigned_policy_name: policy.name,
          updated_at: createDemoTimestamp(),
        };

        return assignedAgent;
      }),
    }));

    if (!assignedAgent) {
      throw new Error('Agent not found.');
    }

    return {
      id: createDemoId('assignment'),
      agent_id: agentId,
      policy_id: policyId,
      is_active: true,
      created_at: createDemoTimestamp(),
    } as T;
  }

  // Create budget
  if (method === 'POST' && pathname === '/api/v1/budgets') {
    const now = createDemoTimestamp();
    const budgetId = createDemoId('budget');
    const allocated = Number(body.allocated_amount ?? 0);

    if (!Number.isFinite(allocated) || allocated <= 0) {
      throw new Error('Budget allocation must be greater than zero.');
    }

    const budget = {
      id: budgetId,
      organization_id: 'demo-org-001',
      agent_id: body.agent_id ? String(body.agent_id) : null,
      name: String(body.name ?? 'Operating Budget'),
      currency: String(body.currency ?? 'USD'),
      allocated_amount: allocated.toFixed(2),
      reserved_amount: '0.00',
      spent_amount: '0.00',
      available_amount: allocated.toFixed(2),
      start_date: now,
      end_date: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    updateDemoDatabase((db) => ({
      ...db,
      budgets: [...db.budgets, budget],
    }));

    return budget as T;
  }


  // Agent credential management
  const credentialStorageKey = 'aeon_demo_credentials_v1';

  const getCredentials = (): Record<string, unknown>[] => {
    let list: Record<string, unknown>[] = [];
    try {
      list = JSON.parse(
        localStorage.getItem(credentialStorageKey) || '[]',
      ) as Record<string, unknown>[];
    } catch {
      list = [];
    }

    const defaultCredentials = [
      {
        id: 'demo-cred-procurement',
        agent_id: 'demo-agent-procurement',
        key_prefix: 'aeon_demo_procure',
        api_key: 'aeon_demo_procurement_key',
        is_revoked: false,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-cred-operations',
        agent_id: 'demo-agent-operations',
        key_prefix: 'aeon_demo_operati',
        api_key: 'aeon_demo_operations_key',
        is_revoked: false,
        revoked_at: null,
        created_at: new Date().toISOString(),
      },
    ];

    let updated = false;
    for (const def of defaultCredentials) {
      if (!list.some((c) => c.agent_id === def.agent_id)) {
        list.push(def);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(credentialStorageKey, JSON.stringify(list));
    }

    return list;
  };

  const saveCredentials = (
    credentials: Record<string, unknown>[],
  ): void => {
    localStorage.setItem(
      credentialStorageKey,
      JSON.stringify(credentials),
    );
  };

  // Rotate agent API key
  const rotateKeyMatch = pathname.match(
    /^\/api\/v1\/agents\/([^/]+)\/keys\/rotate$/,
  );

  if (method === 'POST' && rotateKeyMatch) {
    const agentId = decodeURIComponent(rotateKeyMatch[1]);
    const db = getDemoDatabase();

    if (!db.agents.some((agent) => agent.id === agentId)) {
      throw new Error('Agent not found.');
    }

    const now = createDemoTimestamp();
    const credentialId = createDemoId('credential');
    const rawApiKey = `aeon_demo_${crypto.randomUUID()}`;

    const credentials = getCredentials().map((credential) =>
      credential.agent_id === agentId
        ? {
            ...credential,
            is_revoked: true,
            revoked_at: now,
          }
        : credential,
    );

    credentials.push({
    id: credentialId,
    agent_id: agentId,
    key_prefix: rawApiKey.slice(0, 16),
    api_key: rawApiKey,
    is_revoked: false,
    revoked_at: null,
    created_at: now,
    });

    saveCredentials(credentials);

    return {
      credential_id: credentialId,
      agent_id: agentId,
      raw_api_key: rawApiKey,
      key_prefix: rawApiKey.slice(0, 16),
      created_at: now,
    } as T;
  }

  // List agent credentials
  const credentialListMatch = pathname.match(
    /^\/api\/v1\/agents\/([^/]+)\/keys$/,
  );

  if (method === 'GET' && credentialListMatch) {
    const agentId = decodeURIComponent(credentialListMatch[1]);

    return getCredentials().filter(
      (credential) => credential.agent_id === agentId,
    ) as T;
  }

  // Revoke a specific agent credential
  const credentialRevokeMatch = pathname.match(
    /^\/api\/v1\/agents\/([^/]+)\/keys\/([^/]+)$/,
  );

  if (method === 'DELETE' && credentialRevokeMatch) {
    const agentId = decodeURIComponent(credentialRevokeMatch[1]);
    const credentialId = decodeURIComponent(credentialRevokeMatch[2]);

    const credentials = getCredentials();
    const credential = credentials.find(
      (item) =>
        item.id === credentialId &&
        item.agent_id === agentId,
    );

    if (!credential) {
      throw new Error('Credential not found.');
    }

    if (credential.is_revoked) {
      throw new Error('Credential has already been revoked.');
    }

    const updatedCredential = {
      ...credential,
      is_revoked: true,
      revoked_at: createDemoTimestamp(),
    };

    saveCredentials(
      credentials.map((item) =>
        item.id === credentialId ? updatedCredential : item,
      ),
    );

    return updatedCredential as T;
  }


  // Update an existing budget
  const budgetUpdateMatch = pathname.match(
    /^\/api\/v1\/budgets\/([^/]+)$/,
  );

  if (method === 'PATCH' && budgetUpdateMatch) {
    const budgetId = decodeURIComponent(budgetUpdateMatch[1]);
    const db = getDemoDatabase();

    const existing = db.budgets.find(
      (budget) => budget.id === budgetId,
    );

    if (!existing) {
      throw new Error('Budget not found.');
    }

    const allocated = Number(
      body.allocated_amount ?? existing.allocated_amount,
    );
    const spent = Number(existing.spent_amount ?? 0);
    const reserved = Number(existing.reserved_amount ?? 0);

    if (!Number.isFinite(allocated) || allocated < spent + reserved) {
      throw new Error(
        'Budget allocation cannot be lower than the spent plus reserved amount.',
      );
    }

    const updated = {
      ...existing,
      ...body,
      allocated_amount: allocated.toFixed(2),
      available_amount: (allocated - spent - reserved).toFixed(2),
      updated_at: createDemoTimestamp(),
    };

    updateDemoDatabase((current) => ({
      ...current,
      budgets: current.budgets.map((budget) =>
        budget.id === budgetId ? updated : budget,
      ),
    }));

    return updated as T;
  }


  // List reservations for a budget
  const reservationListMatch = pathname.match(
    /^\/api\/v1\/budgets\/([^/]+)\/reservations$/,
  );

  if (method === 'GET' && reservationListMatch) {
    const budgetId = decodeURIComponent(reservationListMatch[1]);

    return getDemoDatabase().reservations.filter(
      (reservation) => reservation.budget_id === budgetId,
    ) as T;
  }


  // Settle or release a budget reservation
  const reservationActionMatch = pathname.match(
    /^\/api\/v1\/budgets\/reservations\/([^/]+)\/(settle|release)$/,
  );

  if (method === 'POST' && reservationActionMatch) {
    const reservationId = decodeURIComponent(
      reservationActionMatch[1],
    );
    const action = reservationActionMatch[2];

    const db = getDemoDatabase();

    const reservation = db.reservations.find(
      (item) => item.id === reservationId,
    );

    if (!reservation) {
      throw new Error('Budget reservation not found.');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new Error(
        `Cannot ${action} a reservation with status ${String(reservation.status)}.`,
      );
    }

    const budget = db.budgets.find(
      (item) => item.id === reservation.budget_id,
    );

    if (!budget) {
      throw new Error('Associated budget not found.');
    }

    const amount = Number(reservation.amount ?? 0);
    const reserved = Number(budget.reserved_amount ?? 0);
    const spent = Number(budget.spent_amount ?? 0);
    const allocated = Number(budget.allocated_amount ?? 0);

    const nextReserved = Math.max(0, reserved - amount);
    const nextSpent =
      action === 'settle' ? spent + amount : spent;

    const updatedReservation = {
      ...reservation,
      status: action === 'settle' ? 'SETTLED' : 'RELEASED',
      updated_at: createDemoTimestamp(),
    };

    const updatedBudget = {
      ...budget,
      reserved_amount: nextReserved.toFixed(2),
      spent_amount: nextSpent.toFixed(2),
      available_amount: (
        allocated - nextReserved - nextSpent
      ).toFixed(2),
      updated_at: createDemoTimestamp(),
    };

    updateDemoDatabase((current) => ({
      ...current,
      reservations: current.reservations.map((item) =>
        item.id === reservationId ? updatedReservation : item,
      ),
      budgets: current.budgets.map((item) =>
        item.id === budget.id ? updatedBudget : item,
      ),
    }));

    return updatedReservation as T;
  }


// GET: Fetch one policy by ID
const policyDetailMatch = pathname.match(
  /^\/api\/v1\/policies\/([^/]+)$/,
);

if (method === 'GET' && policyDetailMatch) {
  const policyId = policyDetailMatch[1];

  const policy = database.policies.find(
    (item) => item.id === policyId,
  );

  if (!policy) {
    throw new Error('Policy not found');
  }

  return policy as T;
}

// POST: Create a new policy version
const policyVersionMatch = pathname.match(
  /^\/api\/v1\/policies\/([^/]+)\/versions$/,
);

if (method === 'POST' && policyVersionMatch) {
  const policyId = policyVersionMatch[1];

  const policy = database.policies.find(
    (item) => item.id === policyId,
  );

  if (!policy) {
    throw new Error('Policy not found');
  }

  const existingVersions = Array.isArray(policy.versions)
    ? policy.versions as Record<string, unknown>[]
    : [];

  const latestVersion = existingVersions.reduce(
    (latest, version) =>
      Math.max(latest, Number(version.version) || 0),
    0,
  );

  const newVersion = {
    ...body,
    id: createDemoId('policy-version'),
    version: latestVersion + 1,
    created_at: createDemoTimestamp(),
    status: 'DRAFT',
  };

  const updatedPolicy = {
    ...policy,
    versions: [...existingVersions, newVersion],
    updated_at: createDemoTimestamp(),
  };

  updateDemoDatabase((current) => ({
    ...current,
    policies: current.policies.map((item) =>
      item.id === policyId ? updatedPolicy : item,
    ),
    auditEvents: [
      {
        id: createDemoId('audit'),
        action: 'POLICY_VERSION_CREATED',
        resource_type: 'POLICY',
        resource_id: policyId,
        description: `Created policy version ${latestVersion + 1}`,
        created_at: createDemoTimestamp(),
      },
      ...current.auditEvents,
    ],
  }));

  return updatedPolicy as T;
}


const updateAgentMatch = pathname.match(
  /^\/api\/v1\/agents\/([^/]+)$/,
);

if (method === 'PATCH' && updateAgentMatch) {
  const agentId = updateAgentMatch[1];

  const existingAgent = database.agents.find(
    (agent) => agent.id === agentId,
  );

  if (!existingAgent) {
    throw new Error('Agent not found');
  }

  const updatedAgent = {
    ...existingAgent,
    ...body,
    id: agentId,
    updated_at: createDemoTimestamp(),
  };

  updateDemoDatabase((current) => ({
    ...current,
    agents: current.agents.map((agent) =>
      agent.id === agentId ? updatedAgent : agent,
    ),
    auditEvents: [
      {
        id: createDemoId('audit'),
        action: 'AGENT_UPDATED',
        resource_type: 'AGENT',
        resource_id: agentId,
        description: `Updated agent ${agentId}`,
        created_at: createDemoTimestamp(),
      },
      ...current.auditEvents,
    ],
  }));

  return updatedAgent as T;
}


// GET: Fetch purchases with pagination and optional status filtering
if (method === 'GET' && pathname === '/api/v1/purchases') {
  const skip = Math.max(
    0,
    Number(url.searchParams.get('skip') || 0),
  );

  const limit = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get('limit') || 20)),
  );

  const status = url.searchParams.get('status');

  const filteredPurchases = status
    ? database.purchases.filter(
        (purchase) => purchase.status === status,
      )
    : database.purchases;

  const items = filteredPurchases.slice(skip, skip + limit);

  return items as T;
}

// GET: Fetch one purchase by ID
const purchaseDetailMatch = pathname.match(
  /^\/api\/v1\/purchases\/([^/]+)$/,
);

if (method === 'GET' && purchaseDetailMatch) {
  const purchaseId = purchaseDetailMatch[1];

  const purchase = database.purchases.find(
    (item) => item.id === purchaseId,
  );

  if (!purchase) {
    throw new Error('Purchase not found');
  }

  return purchase as T;
}


if (method === 'POST' && pathname === '/api/v1/purchases') {

    const headers = new Headers(init.headers);
const suppliedApiKey = headers.get('X-Agent-API-Key');

if (!suppliedApiKey) {
  throw new Error('Agent API key is required.');
}

const matchingCredential = getCredentials().find(
  (credential) =>
    credential.api_key === suppliedApiKey &&
    credential.is_revoked !== true,
);

if (!matchingCredential) {
  throw new Error('Invalid or revoked agent API key.');
}

const authenticatedAgentId = String(matchingCredential.agent_id);

const authenticatedAgent = database.agents.find(
  (agent) => agent.id === authenticatedAgentId,
);

if (authenticatedAgent === undefined) {
  throw new Error('Agent does not exist.');
}

if (authenticatedAgent.is_active !== true) {
  throw new Error('Agent is inactive.');
}

const assignedBudget = database.budgets.find(
  (budget) =>
    budget.agent_id === authenticatedAgentId &&
    budget.is_active === true,
);

if (!assignedBudget) {
  throw new Error('No active budget is assigned to this agent.');
}

const assignedPolicyId = authenticatedAgent.assigned_policy_id;

const assignedPolicy = database.policies.find(
  (policy) =>
    policy.id === assignedPolicyId &&
    policy.is_active === true,
);

if (!assignedPolicy) {
  throw new Error('No active policy is assigned to this agent.');
}

const policyVersions = Array.isArray(assignedPolicy.versions)
  ? assignedPolicy.versions as Record<string, unknown>[]
  : [];

const activePolicyVersion = policyVersions.find(
  (version) =>
    Number(version.version) === Number(assignedPolicy.current_version),
);

if (!activePolicyVersion) {
  throw new Error('The assigned policy has no current version.');
}

if (!authenticatedAgent || authenticatedAgent.is_active !== true) {
  throw new Error('Agent is inactive or does not exist.');
}

  const itemDescription = String(body.item_description ?? '').trim();
  const category = String(body.category ?? '').trim();
  const maxBudget = Number(body.max_budget);


const currency = String(body.currency ?? 'USD').toUpperCase();

const policyMaxTransaction = Number(
  activePolicyVersion.max_amount_per_transaction,
);

const approvalThreshold = Number(
  activePolicyVersion.approval_threshold_amount,
);

const allowedCurrencies = Array.isArray(
  activePolicyVersion.allowed_currencies,
)
  ? activePolicyVersion.allowed_currencies as string[]
  : [];

const allowedSuppliers = Array.isArray(
  activePolicyVersion.allowed_suppliers,
)
  ? activePolicyVersion.allowed_suppliers as string[]
  : [];

const availableBudget = Number(assignedBudget.available_amount);

if (
  !Number.isFinite(availableBudget) ||
  availableBudget < 0
) {
  throw new Error('Budget balance is invalid.');
}


const policyReasonCodes: string[] = [];

if (maxBudget > policyMaxTransaction) {
  policyReasonCodes.push('MAX_TRANSACTION_LIMIT_EXCEEDED');
}

if (!allowedCurrencies.includes(currency)) {
  policyReasonCodes.push('CURRENCY_NOT_ALLOWED');
}

if (maxBudget > availableBudget) {
  policyReasonCodes.push('INSUFFICIENT_BUDGET');
}

const supplier = String(body.supplier ?? '').trim();

if (supplier && !allowedSuppliers.includes(supplier)) {
  policyReasonCodes.push('SUPPLIER_NOT_ALLOWED');
}


const dailySpendingLimit = Number(
  activePolicyVersion.max_amount_per_day,
);

const today = new Date().toISOString().slice(0, 10);

const dailyCommittedAmount = database.purchases
  .filter((purchase) => {
    const purchaseDate = String(purchase.created_at ?? '').slice(0, 10);

    const purchaseStatus = String(purchase.status ?? '');

    return (
      purchase.agent_id === authenticatedAgentId &&
      purchaseDate === today &&
      ['AUTHORIZED', 'REQUIRES_APPROVAL', 'COMPLETED'].includes(
        purchaseStatus,
      )
    );
  })
  .reduce(
    (total, purchase) =>
      total + Number(purchase.max_budget ?? 0),
    0,
  );

if (dailyCommittedAmount + maxBudget > dailySpendingLimit) {
  policyReasonCodes.push('DAILY_SPENDING_LIMIT_EXCEEDED');
}


const requiresApproval =
  policyReasonCodes.length === 0 &&
  maxBudget > approvalThreshold;


  if (!itemDescription) {
    throw new Error('Item description is required');
  }

  if (!category) {
    throw new Error('Purchase category is required');
  }

  if (!Number.isFinite(maxBudget) || maxBudget <= 0) {
    throw new Error('A valid maximum budget is required');
  }

  const purchase = {
    ...body,
    agent_id: authenticatedAgentId,
    agent_name: authenticatedAgent.name,
    id: createDemoId('purchase'),
    item_description: itemDescription,
    category,
    max_budget: maxBudget,
    currency: String(body.currency ?? 'USD'),
    status:
    policyReasonCodes.length > 0
        ? 'BLOCKED'
        : requiresApproval
        ? 'REQUIRES_APPROVAL'
        : 'AUTHORIZED',
    fulfillment_status: 'NOT_STARTED',
    payment_status: 'NOT_STARTED',
    policy_decision: {
    allowed: policyReasonCodes.length === 0,
    requires_approval: requiresApproval,
    reason_codes:
        policyReasonCodes.length > 0
        ? policyReasonCodes
        : requiresApproval
            ? ['APPROVAL_THRESHOLD_EXCEEDED']
            : [],
    },
    created_at: createDemoTimestamp(),
    updated_at: createDemoTimestamp(),
  };

  if (
  policyReasonCodes.length === 0 &&
  maxBudget > Number(assignedBudget.available_amount)
) {
  throw new Error(
    'Budget availability changed. Please retry the purchase request.',
  );
}

const approval =
  requiresApproval
    ? {
        id: createDemoId('approval'),
        purchase_request_id: purchase.id,
        selected_quote_id: null,
        amount: maxBudget.toFixed(2),
        currency,
        policy_version: Number(assignedPolicy.current_version),
        expires_at: null,
        approver_id: null,
        status: 'PENDING',
        notes: null,
        decided_at: null,
        created_at: createDemoTimestamp(),
        updated_at: createDemoTimestamp(),
      }
    : null;

  const reservation =
  policyReasonCodes.length === 0
    ? {
        id: createDemoId('reservation'),
        organization_id: authenticatedAgent.organization_id,
        agent_id: authenticatedAgentId,
        budget_id: assignedBudget.id,
        purchase_id: purchase.id,
        amount: maxBudget.toFixed(2),
        currency,
        status: 'ACTIVE',
        created_at: createDemoTimestamp(),
      }
    : null;


updateDemoDatabase((current) => ({
  ...current,

  purchases: [purchase, ...current.purchases],

  reservations: reservation
    ? [reservation, ...current.reservations]
    : current.reservations,

    approvals: approval
  ? [approval, ...current.approvals]
  : current.approvals,


  budgets: reservation
    ? current.budgets.map((budget) => {
        if (budget.id !== assignedBudget.id) {
          return budget;
        }

        const newReservedAmount =
          Number(budget.reserved_amount ?? 0) + maxBudget;

        return {
          ...budget,
          reserved_amount: newReservedAmount.toFixed(2),
          available_amount: (
            Number(budget.allocated_amount) -
            Number(budget.spent_amount ?? 0) -
            newReservedAmount
          ).toFixed(2),
          updated_at: createDemoTimestamp(),
        };
      })
    : current.budgets,

  auditEvents: [
    {
      id: createDemoId('audit'),
      action: 'PURCHASE_REQUESTED',
      resource_type: 'PURCHASE',
      resource_id: purchase.id,
      description: `Purchase request submitted: ${itemDescription}`,
      created_at: createDemoTimestamp(),
    },
    ...(reservation
      ? [{
          id: createDemoId('audit'),
          action: 'BUDGET_RESERVED',
          resource_type: 'BUDGET',
          resource_id: String(assignedBudget.id),
          description: `Reserved ${currency} ${maxBudget.toFixed(2)} for purchase ${purchase.id}`,
          created_at: createDemoTimestamp(),
        }]
      : []),
    ...current.auditEvents,
  ],
}));


  return purchase as T;
}


// GET: Fetch approval requests
if (method === 'GET' && pathname === '/api/v1/approvals') {
  const status = url.searchParams.get('status');

  const filteredApprovals = status
    ? database.approvals.filter(
        (approval) => approval.status === status,
      )
    : database.approvals;

  return filteredApprovals as T;
}

// GET: Fetch one approval request
const approvalDetailMatch = pathname.match(
  /^\/api\/v1\/approvals\/([^/]+)$/,
);

if (method === 'GET' && approvalDetailMatch) {
  const approvalId = approvalDetailMatch[1];

  const approval = database.approvals.find(
    (item) => item.id === approvalId,
  );

  if (!approval) {
    throw new Error('Approval request not found.');
  }

  return approval as T;
}


// POST: Record an approval decision
const approvalDecisionMatch = pathname.match(
  /^\/api\/v1\/approvals\/([^/]+)\/decide$/,
);

if (method === 'POST' && approvalDecisionMatch) {
  const approvalId = approvalDecisionMatch[1];
  const decision = String(body.decision ?? '').toUpperCase();

  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new Error('Decision must be APPROVE or REJECT.');
  }

  const approval = database.approvals.find(
    (item) => item.id === approvalId,
  );

  if (!approval) {
    throw new Error('Approval request not found.');
  }

  if (approval.status !== 'PENDING') {
    throw new Error('This approval has already been decided.');
  }

  const now = createDemoTimestamp();

  const updatedApproval = {
    ...approval,
    status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    approver_id: 'demo-user-001',
    notes: String(body.notes ?? ''),
    decided_at: now,
    updated_at: now,
  };
const reservationToRelease =
  decision === 'REJECT'
    ? database.reservations.find(
        (reservation) =>
          reservation.purchase_id === approval.purchase_request_id &&
          reservation.status === 'ACTIVE',
      )
    : undefined;

  updateDemoDatabase((current) => ({
    ...current,
    approvals: current.approvals.map((item) =>
      item.id === approvalId ? updatedApproval : item,
    ),
    purchases: current.purchases.map((purchase) =>
    purchase.id === approval.purchase_request_id
        ? {
            ...purchase,
            status: decision === 'APPROVE'
            ? 'AUTHORIZED'
            : 'BLOCKED',
            policy_decision: {
            ...(purchase.policy_decision as Record<string, unknown>),
            allowed: decision === 'APPROVE',
            requires_approval: false,
            reason_codes: decision === 'APPROVE'
                ? []
                : ['HUMAN_APPROVAL_REJECTED'],
            },
            updated_at: now,
        }
        : purchase,
    ),

    reservations: reservationToRelease
    ? current.reservations.map((reservation) =>
        reservation.id === reservationToRelease.id
            ? {
                ...reservation,
                status: 'RELEASED',
                updated_at: now,
            }
            : reservation,
        )
    : current.reservations,

    budgets: reservationToRelease
    ? current.budgets.map((budget) => {
        if (budget.id !== reservationToRelease.budget_id) {
            return budget;
        }

        const newReservedAmount = Math.max(
            0,
            Number(budget.reserved_amount ?? 0) -
            Number(reservationToRelease.amount),
        );

        return {
            ...budget,
            reserved_amount: newReservedAmount.toFixed(2),
            available_amount: (
            Number(budget.allocated_amount) -
            Number(budget.spent_amount ?? 0) -
            newReservedAmount
            ).toFixed(2),
            updated_at: now,
        };
        })
    : current.budgets,
    
    auditEvents: [
      {
        id: createDemoId('audit'),
        action: decision === 'APPROVE'
          ? 'PURCHASE_APPROVED'
          : 'PURCHASE_REJECTED',
        resource_type: 'APPROVAL',
        resource_id: approvalId,
        description: `Approval ${decision.toLowerCase()}d`,
        created_at: now,
      },
      ...current.auditEvents,
    ],
    ...(reservationToRelease
  ? [{
      id: createDemoId('audit'),
      action: 'BUDGET_RESERVATION_RELEASED',
      resource_type: 'BUDGET',
      resource_id: String(reservationToRelease.budget_id),
      description: `Released reservation for rejected purchase ${approval.purchase_request_id}`,
      created_at: now,
    }]
  : []),
  }));

  return updatedApproval as T;
}


// POST: Create a simulated payment order
if (method === 'POST' && pathname === '/api/v1/payments/create-order') {
  const purchaseId = String(body.purchase_request_id ?? '');

  const purchase = database.purchases.find(
    (item) => item.id === purchaseId,
  );

  if (!purchase) {
    throw new Error('Purchase request not found.');
  }

  if (purchase.status !== 'AUTHORIZED') {
    throw new Error('Only authorized purchases can create payment orders.');
  }

  const existingPayment = database.payments.find(
    (payment) =>
      payment.purchase_request_id === purchaseId &&
      ['ORDER_CREATED', 'BUYER_APPROVAL_PENDING'].includes(
        String(payment.status),
      ),
  );

  if (existingPayment) {
    throw new Error('A payment order already exists for this purchase.');
  }

  const now = createDemoTimestamp();
  const paymentAttemptId = createDemoId('payment');
  const providerOrderId = `DEMO_ORDER_${crypto.randomUUID()}`;

  const payment = {
    id: paymentAttemptId,
    payment_attempt_id: paymentAttemptId,
    purchase_request_id: purchaseId,
    provider: 'DEMO',
    provider_order_id: providerOrderId,
    provider_capture_id: null,
    amount: String(purchase.max_budget),
    currency: String(purchase.currency ?? 'USD'),
    status: 'ORDER_CREATED',
    approval_url: `/payments/success?token=${encodeURIComponent(providerOrderId)}`,
    created_at: now,
    updated_at: now,
  };

  updateDemoDatabase((current) => ({
    ...current,
    payments: [payment, ...current.payments],
    purchases: current.purchases.map((item) =>
      item.id === purchaseId
        ? {
            ...item,
            payment_status: 'ORDER_CREATED',
            updated_at: now,
          }
        : item,
    ),
    
    auditEvents: [
      {
        id: createDemoId('audit'),
        action: 'DEMO_PAYMENT_ORDER_CREATED',
        resource_type: 'PAYMENT',
        resource_id: paymentAttemptId,
        description: `Simulated payment order created for purchase ${purchaseId}`,
        created_at: now,
      },
      ...current.auditEvents,
    ],
  }));

  return {
    payment_attempt_id: paymentAttemptId,
    purchase_request_id: purchaseId,
    provider_order_id: providerOrderId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    approval_url: payment.approval_url,
    created_at: now,
  } as T;
}


// POST: Capture a simulated payment
if (method === 'POST' && pathname === '/api/v1/payments/capture') {
  const providerOrderId = String(body.provider_order_id ?? '');

  const payment = database.payments.find(
    (item) => item.provider_order_id === providerOrderId,
  );

  if (!payment) {
    throw new Error('Demo payment order not found.');
  }

  if (payment.status === 'COMPLETED') {
    throw new Error('This payment has already been captured.');
  }

  if (payment.status !== 'ORDER_CREATED') {
    throw new Error('Payment is not eligible for capture.');
  }

  const purchase = database.purchases.find(
    (item) => item.id === payment.purchase_request_id,
  );

  if (!purchase || purchase.status !== 'AUTHORIZED') {
    throw new Error('Purchase is not authorized for payment.');
  }

  const now = createDemoTimestamp();
  const captureId = `DEMO_CAPTURE_${crypto.randomUUID()}`;
  const transactionId = createDemoId('transaction');

  const activeReservation = database.reservations.find(
  (reservation) =>
    reservation.purchase_id === purchase.id &&
    reservation.status === 'ACTIVE',
);

if (!activeReservation) {
  throw new Error(
    'No active budget reservation exists for this purchase.',
  );
}

  const updatedPayment = {
    ...payment,
    provider_capture_id: captureId,
    status: 'COMPLETED',
    updated_at: now,
  };

  updateDemoDatabase((current) => {

  return {
    ...current,


    payments: current.payments.map((item) =>
      item.id === payment.id ? updatedPayment : item,
    ),

    purchases: current.purchases.map((item) =>
      item.id === purchase.id
        ? {
            ...item,
            status: 'COMPLETED',
            payment_status: 'COMPLETED',
            fulfillment_status: 'PENDING',
            updated_at: now,
          }
        : item,
    ),

    reservations: activeReservation
    ? current.reservations.map((reservation) =>
        reservation.id === activeReservation.id
            ? {
                ...reservation,
                status: 'SETTLED',
                updated_at: now,
            }
            : reservation,
        )
    : current.reservations,

    budgets: activeReservation
    ? current.budgets.map((budget) => {
        if (budget.id !== activeReservation.budget_id) {
            return budget;
        }

        const amount = Number(activeReservation.amount);
        const newReserved =
            Number(budget.reserved_amount ?? 0) - amount;

        const newSpent =
            Number(budget.spent_amount ?? 0) + amount;

        return {
            ...budget,
            reserved_amount: Math.max(0, newReserved).toFixed(2),
            spent_amount: newSpent.toFixed(2),
            available_amount: (
            Number(budget.allocated_amount) -
            newSpent -
            Math.max(0, newReserved)
            ).toFixed(2),
            updated_at: now,
        };
        })
    : current.budgets,

    transactions: [
      {
        id: transactionId,
        purchase_request_id: purchase.id,
        payment_attempt_id: payment.id,
        provider_capture_id: captureId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'SETTLED',
        type: 'PURCHASE',
        created_at: now,
      },
      ...current.transactions,
    ],

    auditEvents: [
            {
        id: createDemoId('audit'),
        action: 'DEMO_PAYMENT_CAPTURED',
        resource_type: 'PAYMENT',
        resource_id: payment.id,
        description: `Simulated payment captured for purchase ${purchase.id}`,
        created_at: now,
      },
      {
        id: createDemoId('audit'),
        action: 'BUDGET_RESERVATION_SETTLED',
        resource_type: 'BUDGET_RESERVATION',
        resource_id: activeReservation.id,
        description: `Budget reservation settled for purchase ${purchase.id}`,
        created_at: now,
      },
      ...current.auditEvents,
    ],
    };
});

  return {
    payment_attempt_id: payment.id,
    purchase_request_id: purchase.id,
    provider_capture_id: captureId,
    amount: payment.amount,
    currency: payment.currency,
    status: 'COMPLETED',
    transaction_id: transactionId,
    completed_at: now,
  } as T;
}

// GET: Fetch simulated transactions
if (method === 'GET' && pathname === '/api/v1/transactions') {
  const params = new URLSearchParams(url.search);

  const page = Math.max(1, Number(params.get('page') || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get('page_size') || 20)),
  );

  const status = params.get('status');
  const type = params.get('type');
  const purchaseRequestId = params.get('purchase_request_id');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const sortBy = params.get('sort_by') || 'created_at';
  const sortOrder = params.get('sort_order') || 'desc';

  let transactions = [...database.transactions];

  if (status) {
    transactions = transactions.filter(
      (item) => item.status === status,
    );
  }

  if (type) {
    transactions = transactions.filter(
      (item) => item.type === type,
    );
  }

  if (purchaseRequestId) {
    transactions = transactions.filter(
      (item) => item.purchase_request_id === purchaseRequestId,
    );
  }

  if (startDate) {
    transactions = transactions.filter(
      (item) =>
        new Date(String(item.created_at)) >= new Date(startDate),
    );
  }

  if (endDate) {
    transactions = transactions.filter(
      (item) =>
        new Date(String(item.created_at)) <= new Date(endDate),
    );
  }

  transactions.sort((a, b) => {
    const aValue = String(a[sortBy] ?? '');
    const bValue = String(b[sortBy] ?? '');

    const comparison = aValue.localeCompare(bValue);

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const total = transactions.length;
  const startIndex = (page - 1) * pageSize;

  return {
    items: transactions.slice(startIndex, startIndex + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  } as T;
}


// GET: Fetch simulated transaction details
const transactionDetailMatch = pathname.match(
  /^\/api\/v1\/transactions\/([^/]+)$/,
);

if (method === 'GET' && transactionDetailMatch) {
  const transactionId = decodeURIComponent(
    transactionDetailMatch[1],
  );

  const transaction = database.transactions.find(
    (item) => item.id === transactionId,
  );

  if (!transaction) {
    throw new Error('Demo transaction not found.');
  }

  const purchase = database.purchases.find(
    (item) => item.id === transaction.purchase_request_id,
  );

  const payment = database.payments.find(
    (item) =>
      item.purchase_request_id === transaction.purchase_request_id,
  );

  return {
    ...transaction,
    purchase_request: purchase
      ? {
          id: String(purchase.id),
          item_description: String(purchase.item_description ?? ''),
          category: String(purchase.category ?? ''),
          status: String(purchase.status ?? ''),
          fulfillment_status: String(
            purchase.fulfillment_status ?? 'PENDING',
          ),
          agent_id: String(purchase.agent_id ?? ''),
          agent_name: String(purchase.agent_name ?? 'Unknown agent'),
          supplier_name: purchase.supplier_name
            ? String(purchase.supplier_name)
            : null,
          unit_price: purchase.unit_price
            ? String(purchase.unit_price)
            : null,
          quantity:
            typeof purchase.quantity === 'number'
              ? purchase.quantity
              : null,
        }
      : null,
    payment_attempt: payment
      ? {
          id: String(payment.id),
          provider: 'DEMO',
          status: String(payment.status ?? ''),
          provider_order_id: payment.provider_order_id
            ? String(payment.provider_order_id)
            : null,
          provider_capture_id: payment.provider_capture_id
            ? String(payment.provider_capture_id)
            : null,
          approval_url: payment.approval_url
            ? String(payment.approval_url)
            : null,
        }
      : null,
  } as T;
}

// GET: Fetch simulated payment status
const paymentStatusMatch = pathname.match(
  /^\/api\/v1\/payments\/([^/]+)$/,
);

if (method === 'GET' && paymentStatusMatch) {
  const providerOrderId = decodeURIComponent(
    paymentStatusMatch[1],
  );

  const payment = database.payments.find(
    (item) => item.provider_order_id === providerOrderId,
  );

  if (!payment) {
    throw new Error('Demo payment order not found.');
  }

  return {
    id: payment.id,
    purchase_request_id: payment.purchase_request_id,
    provider: 'DEMO',
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    provider_order_id: payment.provider_order_id,
    provider_capture_id: payment.provider_capture_id,
    approval_url: payment.approval_url,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
  } as T;
}


// GET: Fetch simulated audit events
if (method === 'GET' && pathname === '/api/v1/audit') {
  const params = new URLSearchParams(url.search);

  const page = Math.max(1, Number(params.get('page') || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get('page_size') || 50)),
  );

  const filters = [
    ['actor_type', 'actor_type'],
    ['actor_id', 'actor_id'],
    ['action', 'action'],
    ['entity_type', 'entity_type'],
    ['entity_id', 'entity_id'],
  ] as const;

  let events = database.auditEvents.map((event) => ({
    ...event,
    entity_type: String(
      event.entity_type ?? event.resource_type ?? 'UNKNOWN',
    ),
    entity_id: (event.entity_id ?? event.resource_id ?? null) as
      string | null,
    organization_id: (event.organization_id ?? null) as
      string | null,
    actor_type: String(event.actor_type ?? 'SYSTEM'),
    actor_id: (event.actor_id ?? null) as string | null,
    metadata_json: (event.metadata_json ?? {}) as Record<
      string,
      unknown
    >,
    created_at: String(event.created_at ?? ''),
  }));

  for (const [queryKey, field] of filters) {
    const value = params.get(queryKey);

    if (value) {
      events = events.filter(
        (event) =>
            String(
            (event as unknown as Record<string, unknown>)[field] ?? '',
            ) === value,
        );
    }
  }

  const startDate = params.get('start_date');
  const endDate = params.get('end_date');

  if (startDate) {
    events = events.filter(
      (event) => new Date(event.created_at) >= new Date(startDate),
    );
  }

  if (endDate) {
    events = events.filter(
      (event) => new Date(event.created_at) <= new Date(endDate),
    );
  }

  const sortOrder = params.get('sort_order') || 'desc';

  events.sort((a, b) => {
    const comparison = a.created_at.localeCompare(b.created_at);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const total = events.length;
  const startIndex = (page - 1) * pageSize;

  return {
    items: events.slice(startIndex, startIndex + pageSize),
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  } as T;
}

  throw new Error(
    `Demo endpoint not implemented yet: ${method} ${pathname}`,
  );
}
