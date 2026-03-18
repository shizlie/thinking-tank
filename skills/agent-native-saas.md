---
name: agent-native-saas
description: Build SaaS products from scratch that are agent-first — capturing value in the data layer and agent interaction layer (MCP/WebMCP), not the UI layer.
version: 1.0.0
---

# Agent-Native SaaS — Build From Scratch for the Agent Era

## Philosophy

The traditional SaaS playbook was: build a great UI, add API later.
The 2026 playbook is: build a great agent interface, add UI if needed.

Value is polarizing — moving UP to the agent orchestration layer and DOWN to the data/system-of-record layer. The middle (dashboards, CRUD UIs, per-seat pricing) is getting crushed. This skill encodes how to build on the winning layers from day one.

```
WHERE VALUE LIVES NOW:

  🤖 Agent Layer          ← HIGH VALUE (orchestration, intelligence)
  🔌 Protocol Layer       ← YOU BUILD THIS (MCP server, WebMCP, APIs)
  🖥️ Application Layer    ← LOW VALUE (thin UI, optional)
  🗄️ Data Layer           ← HIGH VALUE (you own this — your moat)
```

## When to Use This Skill

- Starting a new SaaS product or developer tool
- Building a product in a category where AI agents can replicate the UI workflow (marketing automation, analytics, CRM, project management, content management)
- You want to be agent-native from day one, not retrofit later
- You are a solo builder or small team and want maximum leverage

## Architecture: The Agent-Native Stack

<!-- NOTE FOR AGENTS: This diagram shows the full architecture.
     The key insight is that MCP Server, REST API, and WebMCP are all
     thin adapters calling the SAME service layer through shared Zod schemas.
     Never put business logic in adapters. -->

### Full Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONSUMERS                                         │
│                                                                             │
│    Human User              AI Agent               AI Agent (browser)        │
│    (dashboard)             (Claude, GPT)           (Chrome + WebMCP)        │
│        │                       │                        │                   │
└────────┼───────────────────────┼────────────────────────┼───────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ADAPTER LAYER (thin, no logic)                         │
│                                                                             │
│  ╔══════════════╗    ┌──────────────┐    ┌───────────────┐                  │
│  ║  REST API    ║    │  MCP Server  │    │  WebMCP Tools │                  │
│  ║  (optional,  ║    │  (PRIMARY    │    │  (browser-    │                  │
│  ║   existing)  ║    │   interface) │    │   side)       │                  │
│  ╚══════╤═══════╝    └──────┬───────┘    └──────┬────────┘                  │
│         │                   │                   │                           │
│         │    Each adapter: ~50-100 lines of glue code                       │
│         │    Parse input → call service → format response                   │
└─────────┼───────────────────┼───────────────────┼───────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SHARED SCHEMAS (Zod)                                    │
│                                                                             │
│    schemas/campaign.ts  ──→  CreateCampaignInput, Campaign                  │
│    schemas/segment.ts   ──→  CreateSegmentInput, Segment                    │
│    schemas/event.ts     ──→  IngestEventInput, Event                        │
│                                                                             │
│    ONE schema definition produces:                                          │
│    ├── MCP tool parameters (Zod shape)                                      │
│    ├── API request validation (Zod parse)                                   │
│    ├── WebMCP inputSchema (zodToJsonSchema)                                 │
│    ├── TypeScript types (z.infer)                                           │
│    └── Service layer input types (same inferred type)                       │
│                                                                             │
│    ⚠ This is the GLUE that prevents drift between adapters                 │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER (all business logic)                       │
│                                                                             │
│    services/campaign.service.ts                                             │
│    ├── create(input) ──→ validate → authz check → persist → side effects   │
│    ├── send(id) ──→ check status → send via integration → update status    │
│    ├── getPerformance(id) ──→ query metrics → compute aggregates           │
│    └── suggestOptimization(id) ──→ analyze history → rank suggestions      │
│                                                                             │
│    RULES:                                                                   │
│    ├── ALL validation happens here (defensive, even if adapter validated)   │
│    ├── ALL authorization checks happen here                                 │
│    ├── ALL side effects (email, webhooks, audit logs) happen here           │
│    └── Adapters NEVER contain business logic                                │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
┌────────────────────┐ ┌──────────────┐ ┌─────────────────┐
│   REPOSITORY       │ │  INTEGRATIONS│ │  AUTHORIZATION   │
│                    │ │              │ │                   │
│  repos/            │ │  email.ts    │ │  agent-auth.ts    │
│  campaign.repo.ts  │ │  push.ts     │ │  OAuth + scopes   │
│  segment.repo.ts   │ │  analytics.ts│ │  rate limits      │
│  event.repo.ts     │ │              │ │  budget caps      │
│                    │ │  Swap without│ │  approval gates   │
│  Pure SQL/ORM      │ │  touching    │ │  audit logs       │
│  No business logic │ │  services    │ │                   │
└────────┬───────────┘ └──────────────┘ └───────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER (your moat)                                   │
│                                                                             │
│    PostgreSQL                                                               │
│    ├── events (behavioral data — compounds over time)                       │
│    ├── segments (audience definitions)                                      │
│    ├── campaigns (execution history)                                        │
│    └── campaign_metrics (performance time-series — THIS is the moat)        │
│                                                                             │
│    The more data you accumulate, the smarter your tools get.                │
│    Agents can send emails via SendGrid directly.                            │
│    They CANNOT fabricate your historical performance data.                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How Data Flows Through the Stack

<!-- NOTE FOR AGENTS: This shows a concrete example of a single tool call
     flowing through all layers. Use this to understand the call chain. -->

```
EXAMPLE: Agent calls create_campaign

  Agent sends:  { segment_id: "abc", channel: "email", subject: "Hi", body: "..." }
       │
       ▼
  MCP Server (adapter):
  │  1. Receives params from MCP protocol
  │  2. Parses with CreateCampaignInput.parse(params)  ← shared schema
  │  3. Calls campaignService.create(parsed)
  │  4. Formats response as MCP content
       │
       ▼
  Service Layer:
  │  1. Re-validates input (defensive)
  │  2. Looks up segment → checks it exists, gets tenant_id
  │  3. Checks authorization → can this agent create campaigns? within budget?
  │  4. Calls campaignRepo.insert() → persists to DB
  │  5. If schedule_at, calls emailIntegration.schedule() → queues with SendGrid
  │  6. Writes audit log
  │  7. Returns Campaign object
       │
       ▼
  MCP Server (adapter):
  │  Wraps Campaign object in MCP response format
  │  { content: [{ type: "text", text: JSON.stringify(campaign) }] }
       │
       ▼
  Agent receives structured campaign data with ID for tracking
```

### Layer 1: MCP Server (Your Primary Interface)

The MCP server IS your product's primary interface. Not the dashboard — the MCP server. Build it first.

```
┌──────────────────────────────────────────────────┐
│                  MCP SERVER                      │
│                                                  │
│  Tools (actions agents can take):                │
│  ├── create_campaign(segment, channel, content)  │
│  ├── analyze_segment(criteria) → stats           │
│  ├── get_performance(campaign_id) → metrics      │
│  ├── suggest_optimization(campaign_id) → ideas   │
│  └── list_segments() → segments[]                │
│                                                  │
│  Resources (data agents can read):               │
│  ├── campaigns://active → current campaigns      │
│  ├── segments://all → all user segments          │
│  ├── analytics://dashboard → key metrics         │
│  └── templates://library → message templates     │
│                                                  │
│  Prompts (suggested workflows):                  │
│  ├── "Win-back campaign" → guided flow           │
│  ├── "Weekly performance report" → analysis      │
│  └── "Segment discovery" → find new segments     │
└──────────────────────────────────────────────────┘
```

#### Implementation Pattern (TypeScript)

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({
    name: 'your-product',
    version: '1.0.0',
});

// TOOLS — actions with side effects
server.tool(
    'create_campaign',
    'Create and schedule a marketing campaign for a user segment',
    {
        segment_id: z.string().describe('ID of the target segment'),
        channel: z.enum(['email', 'push', 'sms', 'in-app']),
        subject: z.string().describe('Message subject line'),
        body: z.string().describe('Message body content'),
        schedule_at: z
            .string()
            .datetime()
            .optional()
            .describe('ISO 8601 datetime, or omit for immediate'),
    },
    async ({ segment_id, channel, subject, body, schedule_at }) => {
        // Your business logic here
        // IMPORTANT: validate agent authorization before executing
        const campaign = await campaignService.create({
            segment_id,
            channel,
            subject,
            body,
            schedule_at,
        });
        return {
            content: [
                { type: 'text', text: JSON.stringify(campaign, null, 2) },
            ],
        };
    },
);

// RESOURCES — read-only data access
server.resource(
    'analytics://dashboard',
    'analytics://dashboard',
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: 'application/json',
                text: JSON.stringify(await analyticsService.getDashboard()),
            },
        ],
    }),
);

// PROMPTS — guided workflows
server.prompt(
    'win-back-campaign',
    'Guide the agent through creating a win-back campaign for churned users',
    { days_inactive: z.string().default('30') },
    ({ days_inactive }) => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze users inactive for ${days_inactive}+ days.
               Suggest 3 segment strategies, then create a campaign
               with A/B tested subject lines for the best segment.`,
                },
            },
        ],
    }),
);
```

#### Tool Design Principles

1. **Name tools by OUTCOME, not implementation**: `suggest_optimization` not `run_ml_model`
2. **Rich descriptions**: The description IS your documentation. Agents read it to decide when/how to call your tool.
3. **Return structured data**: Always return JSON. Include metadata (IDs, timestamps, pagination info).
4. **Granular tools > god tools**: `create_campaign` + `add_variant` + `schedule_campaign` beats one giant `do_everything` tool. Let the agent orchestrate.
5. **Include guardrails in tool logic**: Rate limits, budget caps, approval workflows — encode safety into the tool, don't trust the agent to self-limit.

### Layer 1.5: The Inner Architecture (Service Layer + Shared Schemas)

The MCP server is a thin adapter. Below it sits the **service layer** — the single source of truth for all business logic. This is the most important architectural decision for consistency and maintainability.

```
THE CONSISTENCY PROBLEM:

  Without shared schemas, MCP and API drift apart:

  MCP tool says:  channel = "email" | "push" | "sms"
  API route says: channel = "email" | "push" | "sms" | "in-app"   ← drift!
  Service says:   channel = string                                 ← no validation!

  With shared schemas, one definition rules everything:

  schemas/campaign.ts defines:  channel = "email" | "push" | "sms" | "in-app"
  MCP tool uses:                campaignSchemas.create        ← same schema
  API route uses:               campaignSchemas.create        ← same schema
  Service validates with:       campaignSchemas.create        ← same schema
```

#### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        ADAPTERS (thin, no logic)                 │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────────┐ │
│  │ MCP Server  │   │  REST API    │   │  WebMCP (browser)     │ │
│  │ (stdio/SSE) │   │  (HTTP)      │   │  (navigator.model     │ │
│  │             │   │              │   │   Context)             │ │
│  └──────┬──────┘   └──────┬───────┘   └───────────┬───────────┘ │
│         │                 │                       │              │
└─────────┼─────────────────┼───────────────────────┼──────────────┘
          │                 │                       │
          ▼                 ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SHARED SCHEMAS (Zod)                           │
│                                                                  │
│  schemas/campaign.ts  — CreateCampaignInput, Campaign, etc.      │
│  schemas/segment.ts   — CreateSegmentInput, Segment, etc.        │
│  schemas/event.ts     — IngestEventInput, Event, etc.            │
│                                                                  │
│  One schema definition → used by MCP tool params, API request    │
│  validation, service layer input validation, AND TypeScript types │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (all business logic)             │
│                                                                  │
│  services/campaign.service.ts                                    │
│  ├── create(input: CreateCampaignInput): Promise<Campaign>       │
│  ├── send(campaignId: string): Promise<SendResult>               │
│  ├── getPerformance(campaignId: string): Promise<Metrics>        │
│  └── suggestOptimization(campaignId: string): Promise<Suggestion>│
│                                                                  │
│  services/segment.service.ts                                     │
│  ├── create(input: CreateSegmentInput): Promise<Segment>         │
│  ├── evaluate(segmentId: string): Promise<UserCount>             │
│  └── list(tenantId: string): Promise<Segment[]>                  │
│                                                                  │
│  Rules:                                                          │
│  - ALL validation happens here (using shared schemas)            │
│  - ALL authorization checks happen here                          │
│  - ALL side effects (email sending, webhooks) happen here        │
│  - Adapters NEVER contain business logic                         │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER (data access)                │
│                                                                  │
│  repos/campaign.repo.ts                                          │
│  ├── insert(data): Promise<Campaign>                             │
│  ├── findById(id): Promise<Campaign | null>                      │
│  ├── updateStatus(id, status): Promise<void>                     │
│  └── listByTenant(tenantId, filters): Promise<Campaign[]>        │
│                                                                  │
│  Rules:                                                          │
│  - Pure data access — no business logic                          │
│  - Returns domain types (not raw DB rows)                        │
│  - Handles DB-specific concerns (SQL, indexes, transactions)     │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES (integrations)                    │
│                                                                  │
│  integrations/email.ts     — SendGrid/Resend wrapper             │
│  integrations/push.ts      — Firebase/OneSignal wrapper          │
│  integrations/analytics.ts — PostHog/Mixpanel wrapper            │
│                                                                  │
│  Rules:                                                          │
│  - Thin wrappers with retry logic                                │
│  - Swap providers without touching service layer                 │
│  - Each integration has its own error types                      │
└──────────────────────────────────────────────────────────────────┘
```

#### Shared Schemas: The Glue That Keeps Everything Consistent

Zod schemas are the single source of truth. They are used FOUR ways:

```typescript
// schemas/campaign.ts — DEFINE ONCE

import { z } from 'zod';

// Input schema: what callers provide
export const CreateCampaignInput = z.object({
    segment_id: z.string().uuid().describe('ID of target segment'),
    channel: z
        .enum(['email', 'push', 'sms', 'in-app'])
        .describe('Delivery channel'),
    subject: z.string().min(1).max(200).describe('Message subject line'),
    body: z
        .string()
        .min(1)
        .max(10000)
        .describe('Message body (HTML for email)'),
    schedule_at: z
        .string()
        .datetime()
        .optional()
        .describe('ISO 8601 send time, omit for immediate'),
});

// Output type: what callers receive
export const Campaign = z.object({
    id: z.string().uuid(),
    segment_id: z.string().uuid(),
    channel: z.enum(['email', 'push', 'sms', 'in-app']),
    status: z.enum([
        'draft',
        'scheduled',
        'sending',
        'sent',
        'paused',
        'failed',
    ]),
    subject: z.string(),
    body: z.string(),
    segment_size: z.number().int(),
    scheduled_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
});

// Inferred TypeScript types — no separate type definitions needed
export type CreateCampaignInput = z.infer<typeof CreateCampaignInput>;
export type Campaign = z.infer<typeof Campaign>;
```

**USE 1: MCP tool parameters** — the schema IS the tool's input definition:

```typescript
// mcp/server.ts — MCP adapter (thin, no logic)
import { CreateCampaignInput } from '../schemas/campaign.js';

server.tool(
    'create_campaign',
    'Create a marketing campaign targeting a user segment...',
    CreateCampaignInput.shape, // ← Zod shape goes directly into MCP tool definition
    async (params) => {
        // Adapter only: parse, call service, format response
        const input = CreateCampaignInput.parse(params);
        const campaign = await campaignService.create(input);
        return {
            content: [
                { type: 'text', text: JSON.stringify(campaign, null, 2) },
            ],
        };
    },
);
```

**USE 2: REST API request validation** — same schema validates HTTP requests:

```typescript
// api/routes/campaigns.ts — API adapter (thin, no logic)
import { CreateCampaignInput } from '../schemas/campaign.js';

router.post('/api/campaigns', async (req, res) => {
    const input = CreateCampaignInput.parse(req.body); // same validation as MCP
    const campaign = await campaignService.create(input); // same service call
    res.json(campaign);
});
```

**USE 3: Service layer input validation** — belt AND suspenders:

```typescript
// services/campaign.service.ts — ALL business logic lives here
import { CreateCampaignInput, Campaign } from '../schemas/campaign.js';

export class CampaignService {
    constructor(
        private campaignRepo: CampaignRepo,
        private segmentRepo: SegmentRepo,
        private emailService: EmailIntegration,
        private authz: AuthorizationService,
    ) {}

    async create(input: CreateCampaignInput): Promise<Campaign> {
        // 1. Validate (schema already parsed by adapter, but service is defensive)
        const validated = CreateCampaignInput.parse(input);

        // 2. Business rules (NOT in adapter, NOT in repo — HERE)
        const segment = await this.segmentRepo.findById(validated.segment_id);
        if (!segment) throw new NotFoundError('Segment', validated.segment_id);

        if (
            validated.schedule_at &&
            new Date(validated.schedule_at) < new Date()
        ) {
            throw new ValidationError('schedule_at must be in the future');
        }

        // 3. Authorization check
        await this.authz.assertCanCreateCampaign(
            segment.tenant_id,
            segment.user_count,
        );

        // 4. Persist
        const campaign = await this.campaignRepo.insert({
            ...validated,
            status: validated.schedule_at ? 'scheduled' : 'draft',
            tenant_id: segment.tenant_id,
        });

        // 5. Side effects
        if (validated.schedule_at) {
            await this.emailService.schedule(
                campaign.id,
                validated.schedule_at,
            );
        }

        return campaign;
    }
}
```

**USE 4: WebMCP imperative tool** — same schema generates the JSON Schema for browser agents:

```typescript
// ui/webmcp.ts — browser-side agent tools
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CreateCampaignInput } from '../schemas/campaign.js';

if (navigator.modelContext) {
    navigator.modelContext.registerTool({
        name: 'create_campaign',
        description: 'Create a marketing campaign...',
        inputSchema: zodToJsonSchema(CreateCampaignInput), // Zod → JSON Schema
        async execute(params) {
            // Browser calls the same API endpoint
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            return { result: await res.json() };
        },
    });
}
```

#### Project Structure for Agent-Native SaaS

```
your-product/
├── schemas/                    ← SHARED SCHEMAS (the glue)
│   ├── campaign.ts             # CreateCampaignInput, Campaign, etc.
│   ├── segment.ts              # CreateSegmentInput, Segment, etc.
│   ├── event.ts                # IngestEventInput, Event, etc.
│   └── index.ts                # re-exports all schemas
│
├── services/                   ← BUSINESS LOGIC (the brain)
│   ├── campaign.service.ts     # create, send, getPerformance, suggestOptimization
│   ├── segment.service.ts      # create, evaluate, list
│   ├── event.service.ts        # ingest, query
│   └── index.ts                # service factory with dependency injection
│
├── repos/                      ← DATA ACCESS (the memory)
│   ├── campaign.repo.ts        # SQL queries, transactions
│   ├── segment.repo.ts
│   ├── event.repo.ts
│   └── db.ts                   # connection pool, migrations
│
├── integrations/               ← EXTERNAL SERVICES (the arms)
│   ├── email.ts                # SendGrid/Resend
│   ├── push.ts                 # Firebase/OneSignal
│   └── analytics.ts            # PostHog
│
├── adapters/                   ← THIN ADAPTERS (the mouths)
│   ├── mcp/
│   │   ├── server.ts           # MCP server — calls services
│   │   └── index.ts            # entry point for stdio/SSE transport
│   ├── api/
│   │   ├── routes/
│   │   │   ├── campaigns.ts    # REST routes — calls services
│   │   │   ├── segments.ts
│   │   │   └── events.ts
│   │   └── server.ts           # Express/Hono app
│   └── webmcp/
│       └── tools.ts            # WebMCP registrations — calls API
│
├── auth/                       ← AUTHORIZATION
│   ├── agent-auth.ts           # OAuth + scope validation for agents
│   ├── session-auth.ts         # Session auth for human UI
│   └── middleware.ts           # Shared auth middleware
│
└── tests/
    ├── services/               # Test business logic directly
    ├── adapters/               # Test MCP + API adapters
    └── integration/            # End-to-end: agent → MCP → service → DB
```

#### Why This Structure Matters

```
THE ADAPTER PATTERN PAYOFF:

  Adding a new interface = adding a new adapter, NOT rewriting logic.

  Today:   MCP server + REST API
  Month 2: + WebMCP tools (new adapter, same services)
  Month 4: + Slack bot integration (new adapter, same services)
  Month 6: + Zapier/Make integration (new adapter, same services)

  Every adapter is ~50 lines of glue code.
  Business logic changes ONCE in the service layer.

  If you put business logic in the MCP tool handler:
  ├── You'll copy-paste it to the API route handler
  ├── Then to the WebMCP handler
  ├── Then to the Slack bot handler
  ├── They'll drift apart within weeks
  └── Bugs get fixed in one place but not the others
```

#### Dependency Injection for Testability

```typescript
// services/index.ts — wire everything together
import { CampaignService } from './campaign.service.js';
import { SegmentService } from './segment.service.js';
import { CampaignRepo } from '../repos/campaign.repo.js';
import { SegmentRepo } from '../repos/segment.repo.js';
import { EmailIntegration } from '../integrations/email.js';
import { createPool } from '../repos/db.js';

export function createServices(config: AppConfig) {
    const pool = createPool(config.databaseUrl);

    // Repos
    const campaignRepo = new CampaignRepo(pool);
    const segmentRepo = new SegmentRepo(pool);

    // Integrations
    const emailService = new EmailIntegration(config.sendgridApiKey);

    // Auth
    const authz = new AuthorizationService(config);

    // Services (business logic)
    const campaignService = new CampaignService(
        campaignRepo,
        segmentRepo,
        emailService,
        authz,
    );
    const segmentService = new SegmentService(segmentRepo);

    return { campaignService, segmentService };
}

// MCP adapter uses it:
const { campaignService, segmentService } = createServices(config);

// API adapter uses the SAME instances:
const app = createApiServer({ campaignService, segmentService });

// Tests inject mocks:
const campaignService = new CampaignService(
    mockCampaignRepo, // in-memory
    mockSegmentRepo, // in-memory
    mockEmailService, // no-op
    mockAuthz, // always allows
);
```

### Layer 2: Data Layer (Your Moat)

The MCP server is easy to replicate. The data is NOT. This is your actual moat.

```
DATA MOAT STRATEGY:

  ┌──────────────────────────────────────────────┐
  │           PROPRIETARY DATA ASSETS             │
  │                                               │
  │  1. EVENT STREAM (behavioral data)            │
  │     - User actions, page views, clicks        │
  │     - Requires SDK integration = sticky        │
  │     - Accumulates over time = compounds        │
  │                                               │
  │  2. PERFORMANCE HISTORY                        │
  │     - Which campaigns worked, for whom, when   │
  │     - Cross-customer benchmarks (anonymized)   │
  │     - This is what makes suggest_optimization  │
  │       actually intelligent                     │
  │                                               │
  │  3. IDENTITY GRAPH                             │
  │     - Anonymous → known user resolution        │
  │     - Cross-device, cross-channel identity     │
  │     - Hard to rebuild, easy to lose            │
  │                                               │
  │  4. DOMAIN MODELS                              │
  │     - Segment definitions, scoring models      │
  │     - Campaign templates with proven results   │
  │     - Industry/vertical benchmarks             │
  └──────────────────────────────────────────────┘
```

#### Concrete Data Schema (PostgreSQL)

```sql
-- Events: your most valuable table. Every user action.
CREATE TABLE events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id   UUID NOT NULL,
  user_id     TEXT NOT NULL,          -- your customer's user
  event_name  TEXT NOT NULL,          -- 'page_view', 'purchase', 'signup'
  properties  JSONB DEFAULT '{}',     -- flexible event properties
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Partition by tenant + time for query performance
  PRIMARY KEY (tenant_id, id)
) PARTITION BY RANGE (timestamp);

-- Segments: reusable audience definitions
CREATE TABLE segments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  criteria    JSONB NOT NULL,          -- {"inactive_days": 30, "has_purchased": true}
  auto_refresh BOOLEAN DEFAULT true,
  user_count  INTEGER DEFAULT 0,       -- cached count
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns: execution history + performance
CREATE TABLE campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  segment_id  UUID REFERENCES segments(id),
  channel     TEXT NOT NULL,
  status      TEXT DEFAULT 'draft',    -- draft, scheduled, sending, sent, paused
  subject     TEXT,
  body        TEXT,
  variants    JSONB DEFAULT '[]',      -- A/B test variants
  performance JSONB DEFAULT '{}',      -- opens, clicks, conversions — ACCUMULATES
  scheduled_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign performance snapshots: time-series of how campaigns performed
-- THIS is what makes your suggest_optimization tool intelligent
CREATE TABLE campaign_metrics (
  campaign_id UUID REFERENCES campaigns(id),
  measured_at TIMESTAMPTZ NOT NULL,
  sent        INTEGER DEFAULT 0,
  delivered   INTEGER DEFAULT 0,
  opened      INTEGER DEFAULT 0,
  clicked     INTEGER DEFAULT 0,
  converted   INTEGER DEFAULT 0,
  unsubscribed INTEGER DEFAULT 0,
  PRIMARY KEY (campaign_id, measured_at)
);
```

**Key insight**: The `campaign_metrics` table is your real moat. Over time, you accumulate performance data that makes your optimization tools genuinely intelligent. An agent can send emails via SendGrid directly — but it can't tell you "win-back campaigns with question-based subject lines convert 2.3x better for e-commerce users inactive 30-60 days" without YOUR data.

### Layer 3: Agent Authorization & Safety

This is what most "agent-native" guides miss. When agents act on behalf of users, you need:

```
AGENT AUTHORIZATION MODEL:

  Agent presents:
  ├── OAuth token (identifies the human who authorized)
  ├── Scope claims (what actions are permitted)
  └── Budget/rate limits (how much can be spent/sent)

  Your MCP server checks:
  ├── Is this token valid? (standard OAuth)
  ├── Is this action within scope? (e.g., can send email but not delete contacts)
  ├── Is this within budget? (e.g., max 10K emails per day)
  ├── Does this need human approval? (e.g., campaigns over $1000 budget)
  └── Audit log everything (which agent, which action, which human authorized)
```

#### Implementation Pattern

```typescript
// Middleware: check agent authorization before every tool execution
async function authorizeAgentAction(
    toolName: string,
    params: Record<string, unknown>,
    context: McpContext,
): Promise<{ authorized: boolean; reason?: string }> {
    const token = context.authToken;
    const scopes = decodeScopes(token);

    // Check tool-level permission
    if (!scopes.includes(`tool:${toolName}`)) {
        return {
            authorized: false,
            reason: `Agent not authorized for ${toolName}`,
        };
    }

    // Check budget/rate limits
    const usage = await getAgentUsage(token, toolName);
    const limits = await getAgentLimits(token);

    if (
        toolName === 'create_campaign' &&
        usage.campaignsToday >= limits.maxCampaignsPerDay
    ) {
        return {
            authorized: false,
            reason: `Daily campaign limit reached (${limits.maxCampaignsPerDay})`,
        };
    }

    // Check if human approval required
    if (toolName === 'create_campaign') {
        const segmentSize = await getSegmentSize(params.segment_id as string);
        if (segmentSize > limits.autoApproveThreshold) {
            return {
                authorized: false,
                reason: `Campaign targets ${segmentSize} users — requires human approval`,
            };
        }
    }

    // Audit log
    await auditLog.record({
        agent: token.agentId,
        tool: toolName,
        params,
        human: token.userId,
    });

    return { authorized: true };
}
```

### Layer 4: Optional Thin UI (WebMCP-Enabled)

If you build a dashboard, make it thin and WebMCP-enabled from day one.

```
UI STRATEGY:

  DO build UI for:
  ├── Onboarding / SDK setup (agents can't do this)
  ├── Billing & account management
  ├── Approval workflows (human-in-the-loop)
  ├── Real-time monitoring dashboards
  └── Settings & configuration

  DON'T build UI for:
  ├── Campaign creation (agent does this)
  ├── Segment building (agent does this)
  ├── Report generation (agent does this)
  ├── A/B test setup (agent does this)
  └── Content writing (agent does this natively)
```

When you DO build UI, make it WebMCP-enabled:

```html
<!-- Declarative API: simple forms get agent-readability for free -->
<form
    toolname="create_segment"
    tooldescription="Create a new user segment based on behavioral criteria"
    toolautosubmit="true">
    <input name="name" type="text" placeholder="Segment name" required />
    <input name="inactive_days" type="number" placeholder="Days inactive" />
    <select name="has_purchased">
        <option value="true">Has purchased</option>
        <option value="false">Has not purchased</option>
    </select>
    <button type="submit">Create Segment</button>
</form>
```

```javascript
// Imperative API: complex interactions
if (navigator.modelContext) {
    navigator.modelContext.registerTool({
        name: 'analyze_campaign_performance',
        description:
            "Analyze a specific campaign's performance with charts and recommendations",
        inputSchema: {
            type: 'object',
            properties: {
                campaign_id: {
                    type: 'string',
                    description: 'Campaign ID to analyze',
                },
                compare_to: {
                    type: 'string',
                    enum: ['previous', 'benchmark', 'control'],
                    description: 'Comparison baseline',
                },
            },
            required: ['campaign_id'],
        },
        async execute({ campaign_id, compare_to }) {
            // Call the same functions your human UI uses
            const data = await fetchCampaignAnalysis(campaign_id, compare_to);
            renderAnalysisChart(data); // update the visual UI
            return { result: data }; // return structured data to agent
        },
    });
}
```

## Pricing Model for the Agent Era

```
DEAD MODEL:
  Per-seat, per-month
  Problem: 1 user + AI agent = work of 5 users, but you charge for 1 seat

VIABLE MODELS:
  1. Per-action (consumption-based)
     - $0.001 per event ingested
     - $0.01 per campaign sent
     - $0.10 per optimization suggestion
     - Scales naturally with agent-driven usage

  2. Per-outcome (value-based)
     - % of attributed conversions
     - Pay only when campaigns actually work
     - Aligns incentives perfectly

  3. Platform fee + consumption
     - $49/mo base (data storage, identity, SDK)
     - + per-action fees above base threshold
     - Predictable base + upside from heavy usage

  RECOMMENDED for solo builder: Start with #3
  - Base fee covers your infrastructure costs
  - Consumption fees capture agent-driven value
  - Easy to explain, easy to implement
```

## Build Sequence for Solo Builder

```
WEEK 1-2: Foundation
  ├── Set up PostgreSQL with events, segments, campaigns tables
  ├── Build MCP server with 5 core tools:
  │   ├── ingest_event (accept behavioral data)
  │   ├── create_segment (define audience)
  │   ├── create_campaign (build campaign)
  │   ├── get_performance (read metrics)
  │   └── suggest_optimization (your intelligence layer)
  ├── Connect to email provider (Resend/SendGrid)
  └── Test with Claude Desktop — can an agent run a full campaign?

WEEK 3-4: Data Moat
  ├── Build event ingestion SDK (JS snippet for customer websites)
  ├── Implement identity resolution (anonymous → known user)
  ├── Build segment auto-refresh (materialized views or background jobs)
  ├── Start accumulating campaign_metrics data
  └── Wire suggest_optimization to actually use historical data

WEEK 5-6: Polish & Ship
  ├── Add agent authorization (OAuth, scopes, rate limits)
  ├── Build minimal onboarding UI (setup wizard, SDK install guide)
  ├── Add WebMCP to any UI you build
  ├── Implement billing (Stripe, consumption-based)
  └── Deploy and get first users ingesting events

WEEK 7+: Compound
  ├── More channels (push, SMS, in-app)
  ├── Cross-customer benchmarks (anonymized)
  ├── Advanced tools (predictive segments, send-time optimization)
  └── The more data you have, the better your tools get
```

## Anti-Patterns to Avoid

1. **Building the dashboard first**: Your dashboard is not your product. Your MCP server + data layer is your product.
2. **Thin MCP wrapper over third-party APIs**: If your MCP server just proxies SendGrid, agents will call SendGrid directly. Your tools must add intelligence the raw API doesn't have.
3. **Per-seat pricing**: Dead model. Don't start with it.
4. **Ignoring agent authorization**: The first time an agent sends 100K spam emails through your service, you're done. Build guardrails from day one.
5. **No data accumulation**: If your product doesn't get smarter over time, you have no moat. Every campaign result should feed back into your optimization engine.

## Checklist: Is Your Product Agent-Native?

- [ ] Can an AI agent complete the core workflow WITHOUT opening a browser?
- [ ] Does your MCP server have rich tool descriptions that agents can discover?
- [ ] Do your tools return structured data (JSON), not human-readable strings?
- [ ] Is there an authorization model for agent actions?
- [ ] Does your product accumulate proprietary data that makes tools smarter over time?
- [ ] Is your pricing based on usage/outcomes, not seats?
- [ ] Can your tools be composed (agent chains multiple tools into a workflow)?
- [ ] Do your tools include guardrails (rate limits, budget caps, approval thresholds)?
