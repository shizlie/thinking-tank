---
name: retrofit-saas-for-agents
description: Retrofit an existing SaaS web application with agent interaction layers (MCP server adapter, WebMCP declarative/imperative APIs) so AI agents can interact with your product without screen-scraping.
version: 1.0.0
---

# Retrofit SaaS for Agents — Add Agent Interaction Layers to Existing Web Apps

## Philosophy

You have an existing SaaS application with a working UI. Agents are coming — and they will either interact with your product through a structured protocol you control, or they will brute-force your UI with screen-scraping and DOM manipulation (brittle, slow, error-prone).

This skill teaches you how to add the agent interaction layer WITHOUT rewriting your application. The goal is incremental: keep your UI working for humans while exposing structured interfaces for agents.

```
BEFORE (agent screen-scrapes your UI):

  Agent → Browser → Click buttons → Read DOM → Parse HTML → Hope it works
  Problems: brittle, slow, breaks on UI changes, no guardrails

AFTER (agent uses your protocol layer):

  Agent → MCP Server / WebMCP → Your existing business logic → Structured response
  Benefits: reliable, fast, versioned, authorized, auditable
```

## When to Use This Skill

- You have an existing web application with real users
- AI agents are starting to interact with your product (or you want them to)
- You want to expose agent interfaces WITHOUT rewriting your app
- You want to incrementally adopt agent-readiness, not big-bang migrate
- Your product is at risk of being bypassed by agents calling underlying APIs directly

## The Retrofit Decision Framework

Before you start, assess your product against this matrix:

```
YOUR PRODUCT'S AGENT-READINESS RISK:

  HIGH RISK (agents can bypass you):
  ├── Your product is a UI on top of third-party APIs
  │   (e.g., dashboard for SendGrid, wrapper for Stripe)
  ├── Your core workflow is: fill form → call API → show result
  ├── An agent with API access could replicate your value
  └── ACTION: You need to add intelligence, not just a protocol layer

  MEDIUM RISK (agents need you, but can't talk to you):
  ├── Your product has proprietary data or business logic
  ├── But agents can only interact via screen-scraping your UI
  ├── Your API exists but isn't designed for agent consumption
  └── ACTION: Add MCP server + WebMCP — this skill is exactly for you

  LOW RISK (you're already agent-ready):
  ├── You have a well-documented API with structured responses
  ├── Your data is proprietary and hard to replicate
  ├── Agents already integrate with you via API
  └── ACTION: Add MCP server as a discovery/convenience layer
```

## The Core Principle: Service Layer as Single Source of Truth

Before diving into specific strategies, understand the key architectural decision that makes retrofitting clean and maintainable:

<!-- NOTE FOR AGENTS: This section describes the internal wiring pattern.
     The service layer is the convergence point — all adapters (MCP, API, WebMCP)
     call the same service methods. Never duplicate business logic in adapters. -->

```
THE CONVERGENCE ARCHITECTURE:
                                                                     ┌─ Diagram Key ──────────┐
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ ══ = existing (keep)    │
  │  Human   │  │  Agent   │  │  Agent   │  │  Future  │            │ ── = new (add)          │
  │  (UI)    │  │  (MCP)   │  │ (browser)│  │  (Slack, │            │ ▓▓ = shared schemas     │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  │  Zapier) │            └────────────────────────┘
       │              │             │        └────┬─────┘
       ▼              ▼             ▼             ▼
  ╔═════════╗  ┌──────────┐  ┌──────────┐  ┌──────────┐
  ║  Web    ║  │   MCP    │  │  WebMCP  │  │  Future  │   ◄── ADAPTERS
  ║  Routes ║  │  Server  │  │  Tools   │  │ Adapter  │       (thin, no logic,
  ║(existing)║  │  (NEW)   │  │  (NEW)   │  │  (NEW)   │        ~50 lines each)
  ╚════╤════╝  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │            │             │              │
       │       ┌────┴─────────────┴──────────────┘
       │       │
       ▼       ▼
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ▓         SHARED SCHEMAS (Zod)                       ▓
  ▓                                                    ▓   ◄── ONE definition
  ▓  CreateCampaignInput, Campaign, Segment, etc.      ▓       used by ALL adapters
  ▓  Input validation + TypeScript types from ONE file  ▓       (MCP params, API body,
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       WebMCP inputSchema)
       │       │
       ▼       ▼
  ╔══════════════════════════════════════════════════╗
  ║            SERVICE LAYER                         ║
  ║                                                  ║   ◄── ALL business logic
  ║  campaignService.create(input)                   ║       lives HERE
  ║  segmentService.evaluate(id)                     ║       (validation, auth,
  ║  analyticsService.getDashboard()                 ║        side effects)
  ╚══════════════════════╤═══════════════════════════╝
                         │
                         ▼
  ╔══════════════════════════════════════════════════╗
  ║         DATABASE + EXTERNAL SERVICES             ║   ◄── unchanged
  ╚══════════════════════════════════════════════════╝
```

### Why Shared Schemas Are Non-Negotiable

<!-- NOTE FOR AGENTS: Without shared schemas, MCP tool params and API request
     bodies WILL drift apart. Define schemas in one place, import everywhere. -->

The biggest risk in retrofitting is **drift** — your MCP tool accepts different params than your API route, or validates differently. Shared Zod schemas prevent this:

```typescript
// schemas/campaign.ts — DEFINE ONCE, use everywhere
import { z } from 'zod';

export const CreateCampaignInput = z.object({
    segment_id: z.string().uuid().describe('ID of target segment'),
    channel: z.enum(['email', 'push', 'sms', 'in-app']),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    schedule_at: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignInput>;

// USED BY:
// 1. MCP tool    → server.tool('create_campaign', desc, CreateCampaignInput.shape, ...)
// 2. API route   → CreateCampaignInput.parse(req.body)
// 3. WebMCP tool → inputSchema: zodToJsonSchema(CreateCampaignInput)
// 4. Service     → create(input: CreateCampaignInput)
```

### Retrofit: Where to Put Schemas in an Existing Codebase

```
EXISTING PROJECT (before retrofit):

  src/
  ├── routes/          ← has inline validation (req.body.email, etc.)
  ├── controllers/     ← has business logic mixed in
  ├── models/          ← DB models (Prisma, Drizzle, Sequelize, etc.)
  └── utils/

AFTER RETROFIT (add 3 directories):

  src/
  ├── routes/          ← thin: parse + call service + respond
  ├── controllers/     ← gradually migrate logic to services/
  ├── models/          ← unchanged
  ├── utils/
  │
  ├── schemas/         ← NEW: Zod schemas (shared between all adapters)
  │   ├── campaign.ts
  │   ├── segment.ts
  │   └── index.ts
  │
  ├── services/        ← NEW: extracted business logic
  │   ├── campaign.service.ts
  │   ├── segment.service.ts
  │   └── index.ts
  │
  └── mcp/             ← NEW: MCP server (thin adapter)
      ├── server.ts
      └── index.ts
```

### The Extraction Pattern (Incremental, Not Big-Bang)

<!-- NOTE FOR AGENTS: Don't extract all services at once.
     Extract one service at a time, starting with the route
     you want to expose as an MCP tool. -->

```
EXTRACTION ORDER:

  Step 1: Pick ONE route you want to expose as MCP tool
          (e.g., POST /api/campaigns)

  Step 2: Create the Zod schema for that route's input/output
          (schemas/campaign.ts)

  Step 3: Extract the business logic from that route into a service
          (services/campaign.service.ts)

  Step 4: Update the route to call the service
          (routes/campaigns.ts → campaignService.create())

  Step 5: Create the MCP tool calling the SAME service
          (mcp/server.ts → campaignService.create())

  Step 6: Test both paths — same input should produce same output

  Step 7: Repeat for next route

  ┌──────────────────────────────────────────────────────┐
  │  BEFORE extraction:                                   │
  │  Route handler has: validation + auth + logic + DB    │
  │                                                       │
  │  AFTER extraction:                                    │
  │  Route handler has: parse(req.body) → service.call()  │
  │  MCP tool has:      parse(params)   → service.call()  │
  │  Service has:       validation + auth + logic + DB    │
  │                                                       │
  │  BOTH adapters produce IDENTICAL results              │
  └──────────────────────────────────────────────────────┘
```

## Strategy 1: MCP Server Adapter (Server-Side)

Add an MCP server that wraps your existing backend. The MCP server calls the same service layer your controllers/routes call — no new business logic needed.

```
ARCHITECTURE (detailed view):

  ┌─────────────┐     ┌─────────────────┐
  │  Human User │     │    AI Agent      │
  └──────┬──────┘     └────────┬────────┘
         │                     │
         ▼                     ▼
  ╔═════════════╗     ┌─────────────────┐
  ║   Web UI    ║     │   MCP Server    │  ← NEW (adapter layer, ~50-100 lines)
  ║  (existing) ║     │  (TypeScript)   │
  ╚══════╤══════╝     └────────┬────────┘
         │                     │
         │    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
         │    ▓  SHARED SCHEMAS (Zod)              ▓
         │    ▓  Same validation for both paths    ▓
         │    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
         │                     │
         ▼                     ▼
  ╔════════════════════════════════════╗
  ║      SERVICE LAYER                 ║  ← extracted from existing routes
  ║  (business logic, validation,      ║     (or existing if already separated)
  ║   auth, side effects)              ║
  ╚══════════════╤═════════════════════╝
                 │
                 ▼
  ╔════════════════════════════════════╗
  ║         DATABASE                   ║  ← unchanged
  ╚════════════════════════════════════╝
```

#### Step-by-Step Implementation

**Step 1: Audit your existing routes/endpoints**

Map every route in your application to a potential MCP tool:

```
ROUTE AUDIT TABLE:

  ROUTE                    | METHOD | WHAT IT DOES              | MCP TOOL?       | PRIORITY
  -------------------------|--------|---------------------------|-----------------|----------
  /api/campaigns           | POST   | Create campaign           | create_campaign | P1
  /api/campaigns/:id       | GET    | Get campaign details      | get_campaign    | P1
  /api/campaigns/:id/send  | POST   | Send campaign             | send_campaign   | P1
  /api/segments            | GET    | List segments             | list_segments   | P1
  /api/segments            | POST   | Create segment            | create_segment  | P1
  /api/analytics/dashboard | GET    | Dashboard metrics         | MCP Resource    | P2
  /api/users               | GET    | List end users            | list_users      | P2
  /api/settings             | PUT    | Update account settings   | SKIP (human)    | -
  /api/billing              | *      | Billing management        | SKIP (human)    | -
```

Rules:
- **P1**: Core workflow tools — what agents will call most
- **P2**: Supporting data — resources agents will read
- **SKIP**: Human-only operations (billing, account deletion, settings)

**Step 2: Extract your service layer (if not already separated)**

If your business logic lives in route handlers/controllers, extract it first:

```typescript
// BEFORE: logic in route handler (can't reuse for MCP)
app.post("/api/campaigns", async (req, res) => {
  const { segment_id, channel, subject, body } = req.body;
  // validation, business logic, DB calls all inline...
  const campaign = await db.campaigns.create({ ... });
  await emailService.schedule(campaign);
  res.json(campaign);
});

// AFTER: extracted service layer (reusable by both UI routes AND MCP)
// services/campaign.service.ts
export class CampaignService {
  async create(params: CreateCampaignParams): Promise<Campaign> {
    this.validate(params);
    const campaign = await this.db.campaigns.create(params);
    await this.emailService.schedule(campaign);
    return campaign;
  }
}

// Route handler becomes thin
app.post("/api/campaigns", async (req, res) => {
  const campaign = await campaignService.create(req.body);
  res.json(campaign);
});

// MCP tool calls the SAME service
server.tool("create_campaign", "...", schema, async (params) => {
  const campaign = await campaignService.create(params);
  return { content: [{ type: "text", text: JSON.stringify(campaign) }] };
});
```

**This is the most important refactoring step.** If your service layer is clean, the MCP server is just a thin adapter.

**Step 3: Build the MCP server**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CampaignService } from "../services/campaign.service.js";
import { SegmentService } from "../services/segment.service.js";
import { AnalyticsService } from "../services/analytics.service.js";

const server = new McpServer({
  name: "your-existing-product",
  version: "1.0.0",
});

// Inject your existing services — NO new business logic
const campaignService = new CampaignService(db);
const segmentService = new SegmentService(db);
const analyticsService = new AnalyticsService(db);

// Tools: map 1:1 to your existing service methods
server.tool(
  "create_campaign",
  "Create a marketing campaign targeting a specific user segment. " +
  "Supports email, push, SMS, and in-app channels. " +
  "Returns the campaign object with ID for tracking.",
  {
    segment_id: z.string().describe("ID of target segment (use list_segments to find IDs)"),
    channel: z.enum(["email", "push", "sms", "in-app"]).describe("Delivery channel"),
    subject: z.string().max(200).describe("Message subject line"),
    body: z.string().max(10000).describe("Message body (HTML supported for email)"),
    schedule_at: z.string().datetime().optional().describe("Send time in ISO 8601, or omit for immediate"),
  },
  async (params) => {
    const campaign = await campaignService.create(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: campaign.id,
          status: campaign.status,
          segment_size: campaign.segmentSize,
          scheduled_at: campaign.scheduledAt,
          message: `Campaign created targeting ${campaign.segmentSize} users`,
        }, null, 2),
      }],
    };
  }
);

// Resources: read-only data for agent context
server.resource(
  "analytics://dashboard",
  "analytics://dashboard",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(await analyticsService.getDashboard()),
    }],
  })
);

// Dynamic resource: list of segments
server.resource(
  "segments://active",
  "segments://active",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(await segmentService.listActive()),
    }],
  })
);
```

**Step 4: Deploy alongside your existing app**

```
DEPLOYMENT OPTIONS:

  Option A: Same process, different transport
  ├── MCP server runs in same Node.js process as your web app
  ├── Shares the same service layer instances
  ├── Uses stdio transport for local agents (Claude Desktop)
  ├── Uses SSE/HTTP transport for remote agents
  └── Simplest to start with

  Option B: Separate process, shared database
  ├── MCP server runs as separate service
  ├── Connects to same database
  ├── Uses same service layer code (shared package/module)
  ├── Independent scaling
  └── Better for production at scale

  RECOMMENDED: Start with Option A, migrate to B when needed
```

## Strategy 2: WebMCP (Browser-Side)

WebMCP makes your existing web UI agent-readable. This is the fastest path — you're adding attributes to HTML you already have.

<!-- NOTE FOR AGENTS: WebMCP operates in the BROWSER. It connects to your
     existing app via the same API calls your frontend already makes.
     No server-side changes needed for WebMCP alone. -->

### How WebMCP Connects Inward

```
WebMCP FLOW (browser-side agent interacting with your existing app):

  ┌──────────────────────────────────────────────────────────────────┐
  │                        BROWSER                                   │
  │                                                                  │
  │  ┌────────────┐    ┌────────────────────────────────────────┐    │
  │  │  AI Agent  │    │           YOUR WEB APP                 │    │
  │  │  (Chrome   │    │                                        │    │
  │  │  + WebMCP) │    │  ┌──────────────┐  ┌───────────────┐   │    │
  │  │            │    │  │  Declarative │  │  Imperative   │   │    │
  │  │  Reads     │───▶│  │  (HTML form  │  │  (JS tool     │   │    │
  │  │  tool      │    │  │   attrs)     │  │   registration│   │    │
  │  │  contracts │    │  │              │  │               │   │    │
  │  │  + calls   │    │  │  Agent fills │  │  Agent calls  │   │    │
  │  │  tools     │    │  │  form fields │  │  execute()    │   │    │
  │  └────────────┘    │  │  + submits   │  │  function     │   │    │
  │                    │  └──────┬───────┘  └───────┬───────┘   │    │
  │                    │         │                  │            │    │
  │                    │         ▼                  ▼            │    │
  │                    │  ┌─────────────────────────────────┐    │    │
  │                    │  │  YOUR EXISTING FRONTEND CODE    │    │    │
  │                    │  │                                 │    │    │
  │                    │  │  fetch('/api/campaigns', {      │    │    │
  │                    │  │    method: 'POST',              │    │    │
  │                    │  │    body: JSON.stringify(params)  │    │    │
  │                    │  │  })                             │    │    │
  │                    │  │                                 │    │    │
  │                    │  │  Same API calls your React/Vue  │    │    │
  │                    │  │  components already make!       │    │    │
  │                    │  └──────────────┬──────────────────┘    │    │
  │                    └────────────────┼────────────────────────┘    │
  └─────────────────────────────────────┼────────────────────────────┘
                                        │
                                        │ HTTP (same as existing UI)
                                        ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                    YOUR EXISTING BACKEND                         │
  │                                                                  │
  │  API Routes → Service Layer → Database                           │
  │  (completely unchanged — WebMCP requires ZERO backend changes)  │
  └──────────────────────────────────────────────────────────────────┘
```

```
TWO PATHS COMPARED:

  Path 1: DECLARATIVE (zero JS, for simple forms)

    Agent ──→ reads <form toolname="..."> ──→ fills inputs ──→ submits form
                                                                    │
                                                         standard form POST
                                                                    │
                                                              your API route

  Path 2: IMPERATIVE (JS required, for complex interactions)

    Agent ──→ calls navigator.modelContext tool ──→ execute() runs
                                                        │
                                               your existing JS functions
                                               (fetch, store methods, etc.)
                                                        │
                                                  your API route
```

### Declarative API: Forms

Add `toolname` and `tooldescription` attributes to existing forms. Zero JavaScript required.

```html
<!-- BEFORE: standard HTML form -->
<form action="/api/segments" method="POST">
  <label>Segment Name</label>
  <input name="name" type="text" required>

  <label>Inactive Days</label>
  <input name="inactive_days" type="number" min="1" max="365">

  <label>Has Purchased</label>
  <select name="has_purchased">
    <option value="">Any</option>
    <option value="true">Yes</option>
    <option value="false">No</option>
  </select>

  <button type="submit">Create Segment</button>
</form>

<!-- AFTER: same form, 2 attributes added -->
<form action="/api/segments" method="POST"
      toolname="create_segment"
      tooldescription="Create a new user segment based on behavioral criteria. Name is required. inactive_days filters users who haven't been active. has_purchased filters by purchase history."
      toolautosubmit="true">
  <!-- Everything else is identical -->
  <label>Segment Name</label>
  <input name="name" type="text" required>
  <!-- ... same as before ... -->
</form>
```

**That's it.** Two attributes turn a form into an agent-callable tool. The agent reads the tool contract, fills the form fields, and submits.

#### Retrofitting Checklist for Declarative API

```
FOR EACH FORM IN YOUR APP:

  1. Does this form perform an action an agent might want to do?
     YES → add toolname + tooldescription
     NO  → skip (e.g., login form, settings form)

  2. Are the input names descriptive?
     "q" → rename to "search_query"
     "d" → rename to "inactive_days"
     (Agent uses input names to understand what to fill)

  3. Does the form action return useful data?
     YES → toolautosubmit="true"
     NO  → omit toolautosubmit, let agent inspect result

  4. Is the tooldescription rich enough?
     BAD:  "Create segment"
     GOOD: "Create a new user segment based on behavioral criteria.
            Name is required. inactive_days filters users who haven't
            been active for N days. has_purchased filters by purchase
            history (true/false/omit for any)."
```

### Imperative API: Complex Interactions

For SPAs, dynamic UIs, and multi-step workflows that don't map to a single form:

```javascript
// Feature detection first
if ("modelContext" in navigator) {
  // Register tools that map to your existing UI functions

  // Tool 1: Campaign builder (multi-step in UI, single tool for agent)
  navigator.modelContext.registerTool({
    name: "build_and_send_campaign",
    description:
      "Build a complete marketing campaign and optionally send it. " +
      "This combines what a human does across multiple UI screens: " +
      "selecting a segment, choosing a channel, writing content, " +
      "and scheduling delivery.",
    inputSchema: {
      type: "object",
      properties: {
        segment_id: {
          type: "string",
          description: "Target segment ID (call list_segments first to get IDs)",
        },
        channel: {
          type: "string",
          enum: ["email", "push", "sms", "in-app"],
          description: "Delivery channel",
        },
        subject: {
          type: "string",
          description: "Subject line (email/push) or title (in-app)",
        },
        body: {
          type: "string",
          description: "Message body. HTML for email, plain text for others.",
        },
        send_immediately: {
          type: "boolean",
          description: "True to send now, false to save as draft",
        },
      },
      required: ["segment_id", "channel", "subject", "body"],
    },
    async execute(params) {
      // Call the SAME functions your React/Vue/Svelte components call
      const campaign = await window.campaignStore.create({
        segmentId: params.segment_id,
        channel: params.channel,
        subject: params.subject,
        body: params.body,
      });

      if (params.send_immediately) {
        await window.campaignStore.send(campaign.id);
      }

      return {
        result: {
          campaign_id: campaign.id,
          status: params.send_immediately ? "sending" : "draft",
          segment_size: campaign.segmentSize,
        },
      };
    },
  });

  // Tool 2: Read-only data access
  navigator.modelContext.registerTool({
    name: "get_dashboard_metrics",
    description:
      "Get current dashboard metrics including active users, " +
      "campaign performance, and engagement rates.",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "7d", "30d", "90d"],
          description: "Time period for metrics",
        },
      },
    },
    async execute({ period = "30d" }) {
      const metrics = await window.analyticsStore.fetchDashboard(period);
      return { result: metrics };
    },
  });

  // Tool 3: Discovery tool — helps agents understand what's available
  navigator.modelContext.registerTool({
    name: "list_segments",
    description:
      "List all available user segments with their IDs, names, " +
      "sizes, and criteria. Use this to find segment IDs before " +
      "creating campaigns.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      const segments = await window.segmentStore.list();
      return {
        result: segments.map((s) => ({
          id: s.id,
          name: s.name,
          user_count: s.userCount,
          criteria: s.criteria,
        })),
      };
    },
  });
}
```

#### Key Principle: Agent Tools Collapse Multi-Step UI Into Single Actions

```
HUMAN UI FLOW (5 screens):
  Dashboard → Select Segment → Choose Channel → Write Content → Schedule → Confirm

AGENT TOOL (1 call):
  build_and_send_campaign({ segment_id, channel, subject, body, send_immediately })

Both call the SAME service layer underneath.
The agent doesn't need 5 screens — it needs 1 tool with clear parameters.
```

## Strategy 3: REST API Enhancement (Fastest, If You Already Have an API)

If you already have a REST API, you can make it agent-friendly by adding an OpenAPI spec with rich descriptions:

```yaml
# openapi.yaml — AI agents use this as their "tool contract"
openapi: 3.1.0
info:
  title: YourProduct API
  description: |
    Marketing automation API. AI agents should:
    1. Call list_segments to discover available audiences
    2. Call create_campaign to build campaigns
    3. Call get_performance to analyze results
    4. Call suggest_optimization for AI-powered recommendations

paths:
  /api/campaigns:
    post:
      operationId: create_campaign
      summary: Create a marketing campaign
      description: |
        Creates a new campaign targeting a user segment.
        The campaign starts in 'draft' status.
        Call /api/campaigns/{id}/send to actually deliver it.

        IMPORTANT FOR AGENTS:
        - Always call list_segments first to get valid segment IDs
        - For email channel, body supports HTML
        - schedule_at must be in the future (UTC)
        - Campaigns targeting >10K users require human approval
      # ... schema definitions
```

**The key enhancement**: Rich `description` fields that tell agents HOW to use your API effectively. Standard OpenAPI specs describe the API for human developers. Agent-friendly specs describe the API for AI agents — including workflow guidance, constraints, and best practices.

## All Three Strategies Compared

<!-- NOTE FOR AGENTS: Choose strategy based on whether you need browser-based
     or server-based agent interaction. WebMCP = browser only. MCP = no browser.
     API enhancement = works with existing agent tooling. -->

```
STRATEGY COMPARISON — How each connects inward to your app:

  ┌──────────────┬───────────────────┬──────────────────┬───────────────────┐
  │              │  WebMCP           │  MCP Server      │  API Enhancement  │
  │              │  (browser-side)   │  (server-side)   │  (existing API)   │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Agent needs  │ Chrome browser    │ MCP client       │ HTTP client       │
  │              │ with WebMCP flag  │ (Claude Desktop) │ (any agent)       │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Connects to  │ Your frontend JS  │ Your service     │ Your existing     │
  │ your app via │ (fetch, stores)   │ layer directly   │ REST/GraphQL API  │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Backend      │ ZERO changes      │ Add MCP server   │ Add descriptions  │
  │ changes      │ (browser only)    │ + extract service│ to OpenAPI spec   │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Auth model   │ Uses existing     │ New: OAuth +     │ Uses existing     │
  │              │ session/cookies   │ scopes for agents│ API keys          │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Speed        │ Slow (browser     │ Fast (direct     │ Fast (direct      │
  │              │ rendering)        │ service calls)   │ HTTP calls)       │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Effort       │ 1-2 days          │ 1-2 weeks        │ 1-3 days          │
  ├──────────────┼───────────────────┼──────────────────┼───────────────────┤
  │ Best for     │ Quick wins,       │ Production agent │ Already have API, │
  │              │ existing UI forms │ integration      │ want agent discov.│
  └──────────────┴───────────────────┴──────────────────┴───────────────────┘

  RECOMMENDED ORDER: WebMCP Declarative → WebMCP Imperative → MCP Server → Data Moat
  (each phase builds on the previous, nothing is thrown away)
```

## Incremental Adoption Path

<!-- NOTE FOR AGENTS: This is a 4-phase path. Each phase is additive.
     WebMCP requires no backend changes. MCP server requires service extraction.
     Data moat is the long-term play that creates defensibility. -->

```
PHASE 1: WebMCP Declarative (1-2 days)
  ├── Audit all forms in your app
  ├── Add toolname + tooldescription to high-value forms
  ├── Test with Chrome 146+ WebMCP flag
  └── Result: agents can interact with your forms

PHASE 2: WebMCP Imperative (3-5 days)
  ├── Identify multi-step workflows agents need
  ├── Register imperative tools that collapse multi-step into single actions
  ├── Wire tools to your existing store/state management functions
  └── Result: agents can execute complex workflows

PHASE 3: MCP Server (1-2 weeks)
  ├── Extract service layer if not already separated
  ├── Build MCP server wrapping your services
  ├── Add agent authorization (OAuth scopes, rate limits)
  ├── Deploy alongside your web app
  └── Result: agents can interact without a browser at all

PHASE 4: Data Moat (ongoing)
  ├── Identify what proprietary data your product accumulates
  ├── Build tools that leverage historical data for intelligence
  ├── Add cross-customer benchmarks (anonymized)
  └── Result: your tools get smarter over time — this is your moat
```

## Tool Description Writing Guide

The quality of your tool descriptions determines whether agents can use your product effectively. This is your new "UX" — but for agents, not humans.

```
BAD DESCRIPTIONS (agents will misuse your tools):
  ┌─────────────────────────────────────────────────┐
  │ name: "create"                                   │
  │ description: "Creates a new item"                │
  │ Problem: What item? What are the constraints?    │
  └─────────────────────────────────────────────────┘

GOOD DESCRIPTIONS (agents use your tools correctly):
  ┌─────────────────────────────────────────────────────────────┐
  │ name: "create_campaign"                                     │
  │ description: "Create a marketing campaign targeting a       │
  │   specific user segment. Supports email, push, SMS, and     │
  │   in-app channels. Returns the campaign object with ID      │
  │   for tracking. WORKFLOW: call list_segments first to get   │
  │   valid segment IDs. Campaigns targeting >10K users         │
  │   require human approval and will return status             │
  │   'pending_approval'. Email body supports HTML."            │
  │                                                             │
  │ Each parameter also has a rich description:                 │
  │   segment_id: "ID of target segment. Use list_segments      │
  │                to discover available segments and their      │
  │                IDs. Invalid IDs return a 404 error."        │
  └─────────────────────────────────────────────────────────────┘

DESCRIPTION TEMPLATE:
  Line 1: What this tool does (one sentence)
  Line 2: What inputs it needs and what it returns
  Line 3: WORKFLOW — what to call before/after this tool
  Line 4: CONSTRAINTS — limits, approval thresholds, format requirements
  Line 5: ERROR CASES — what can go wrong and what the agent should do
```

## Common Retrofit Mistakes

1. **Exposing every endpoint as a tool**: Agents don't need 50 tools. They need 5-10 well-designed ones that cover the core workflow. Group related endpoints into composite tools.

2. **Returning HTML from tools**: Tools must return structured data (JSON). If your API returns rendered HTML, add a `?format=json` option or create a separate response serializer.

3. **No workflow guidance in descriptions**: Agents don't read your documentation site. The tool description IS their documentation. Include "call X first" and "then call Y" guidance.

4. **Forgetting authorization for agent actions**: Your existing auth (session cookies, CSRF tokens) won't work for MCP agents. Add OAuth/API key auth specifically for agent access.

5. **Not testing with actual agents**: Install your MCP server in Claude Desktop and try to complete a full workflow. You will immediately find missing tools, bad descriptions, and authorization gaps.

6. **Keeping multi-step where single-step suffices**: If your UI has a 5-step wizard, the agent doesn't need 5 tools. It needs 1 tool that accepts all 5 steps as parameters. Collapse multi-step UI workflows into single-call agent tools.

## Testing Your Retrofit

### Manual Testing with Claude Desktop

```json
// claude_desktop_config.json — add your MCP server
{
  "mcpServers": {
    "your-product": {
      "command": "node",
      "args": ["path/to/your/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "your-connection-string",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

Then ask Claude: "List my segments, pick the largest one, and create a win-back email campaign for it." If Claude can do this end-to-end, your retrofit is working.

### Automated Testing

```typescript
// test/mcp-integration.test.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

describe("MCP Server Integration", () => {
  it("should complete a full campaign workflow", async () => {
    // 1. List segments
    const segments = await client.callTool("list_segments", {});
    expect(segments).toHaveLength(greaterThan(0));

    // 2. Create campaign
    const campaign = await client.callTool("create_campaign", {
      segment_id: segments[0].id,
      channel: "email",
      subject: "Test campaign",
      body: "<h1>Hello</h1>",
    });
    expect(campaign.status).toBe("draft");

    // 3. Get performance (should be empty for new campaign)
    const perf = await client.callTool("get_performance", {
      campaign_id: campaign.id,
    });
    expect(perf.sent).toBe(0);
  });

  it("should enforce rate limits for agent actions", async () => {
    // Create campaigns up to the limit
    for (let i = 0; i < MAX_CAMPAIGNS_PER_DAY; i++) {
      await client.callTool("create_campaign", { ... });
    }
    // Next one should fail with clear error
    const result = await client.callTool("create_campaign", { ... });
    expect(result).toContain("Daily campaign limit reached");
  });
});
```

## Checklist: Is Your Retrofit Complete?

- [ ] High-value forms have WebMCP declarative attributes (toolname, tooldescription)
- [ ] Multi-step UI workflows are collapsed into single imperative tools
- [ ] MCP server wraps your existing service layer (no duplicate business logic)
- [ ] Tool descriptions include workflow guidance (what to call before/after)
- [ ] Agent authorization is separate from human session auth
- [ ] Rate limits and guardrails are in place for agent actions
- [ ] Tested end-to-end with a real agent (Claude Desktop or similar)
- [ ] Structured JSON responses from all tools (no HTML)
- [ ] Error responses are clear and actionable for agents
- [ ] Discovery tools exist (list_segments, list_campaigns) so agents can orient themselves
