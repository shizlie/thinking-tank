# "SaaS is Dead" — Research Notes (March 2026)

## 1. The "SaaS is Dead" Narrative

### What Happened

- In early February 2026, the S&P North American Software Index tanked ~15% in 3 days
- Catalyst: Anthropic demonstrated agentic plugins autonomously executing complex workflows in law, finance, and engineering — tasks that previously required multiple SaaS subscriptions
- ~$285 billion wiped from software stock valuations ("SaaSpocalypse")
- Satya Nadella (Microsoft CEO) was widely quoted saying business logic is moving into an AI layer that performs CRUD operations across systems

### The Core Argument

When one user equipped with AI agents can accomplish the work of five traditional employees, the **per-seat pricing model** that underpinned SaaS economics for two decades collapses. IDC predicts that by 2028, pure seat-based pricing will be obsolete, with 70% of software vendors refactoring pricing around consumption, outcomes, or organizational capability.

### The Nuanced Reality (likely what Theo was arguing)

SaaS is NOT dead — but it's being **restructured into layers**:

| What Dies              | What Survives                             | Case-by-Case                 |
| ---------------------- | ----------------------------------------- | ---------------------------- |
| Thin UI wrappers       | Systems of Record (databases, CRMs, ERPs) | Workflow/orchestration tools |
| Simple CRUD dashboards | Deep data moats & network effects         | Domain-specific platforms    |
| Per-seat pricing only  | Regulated/compliance platforms            | Integration platforms        |

**Key insight**: Enterprises are NOT replacing their systems of record — they're building **orchestration/agent layers on top of them**. Value is being sucked upward into the agent layer AND downward into the data layer, with the thin middle UI layer getting crushed.

---

## 2. Theo (t3.gg) — Likely Position

While I couldn't locate the exact video, based on Theo's known positions and the broader discourse, his argument aligns with:

> "SaaS is not dead. But applications now need another layer on top so AI agents can interact with them."

This means:

- The **application itself** still needs to exist (data, business logic, compliance)
- But it needs to **expose a structured interface** for agents (not just a human UI)
- This is the "agent interaction layer" — a protocol/API contract that agents understand
- Without this layer, agents resort to brittle screen-scraping and DOM manipulation

---

## 3. Google WebMCP (Web Model Context Protocol)

### What It Is

A browser-based W3C standard that allows websites to publish a **"Tool Contract"** — a structured declaration of what actions AI agents can perform on the site.

### Timeline

- **Aug 2025**: Google and Microsoft publish unified proposal
- **Sep 2025**: W3C Community Group formally accepts it
- **Feb 2026**: Chrome 146 Canary ships Early Preview behind flag ("WebMCP for testing")

### How It Works — Two APIs

#### Declarative API (HTML-based)

- Handles standard actions defined directly in HTML forms
- Website declares capabilities via structured HTML attributes
- Agent reads the "menu" of available actions
- Best for: simple forms, searches, standard CRUD

#### Imperative API (JavaScript-based)

- Supports complex, dynamic interactions requiring JS execution
- Website provides JS functions agents can call
- Best for: multi-step workflows, dynamic UIs, SPAs

### Use Cases

- **Travel**: Agent searches, filters, and books flights
- **E-commerce**: Agent shops, compares, and purchases
- **Customer Support**: Agent fills in technical details automatically
- **SaaS Dashboards**: Agent interacts with admin panels programmatically

---

## 4. The New Software Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    👤 HUMAN USER                        │
│              (may interact directly OR via agent)       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              🤖 AI AGENT LAYER                          │
│                                                         │
│  • LLM-powered agents (Claude, GPT, Gemini)             │
│  • Task orchestration & planning                        │
│  • Multi-app workflow automation                        │
│  • Natural language → structured actions                │
│                                                         │
│  Examples: Claude Computer Use, Devin, custom agents    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          🔌 AGENT INTERACTION PROTOCOL LAYER            │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   WebMCP     │  │     MCP     │  │   REST/GraphQL  │ │
│  │ (Browser)    │  │  (Desktop)  │  │    APIs          │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                                                         │
│  • Structured "Tool Contracts" for agents               │
│  • Declarative API (HTML forms) + Imperative API (JS)   │
│  • Replaces brittle screen-scraping                     │
│  • THIS IS THE NEW LAYER Theo is talking about          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            🖥️ APPLICATION / SaaS LAYER                  │
│                                                         │
│  • Business logic & domain rules                        │
│  • User Interface (dashboards, admin panels)            │
│  • Authentication & authorization                       │
│  • Compliance & regulatory logic                        │
│                                                         │
│  ⚠️ UI-only wrappers are dying                          │
│  ✅ Apps with deep logic & data moats survive           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            🗄️ DATA / SYSTEM OF RECORD LAYER             │
│                                                         │
│  • Databases (PostgreSQL, MongoDB, etc.)                │
│  • CRMs (Salesforce, HubSpot)                           │
│  • ERPs (SAP, Oracle, Odoo)                             │
│  • Data warehouses & lakes                              │
│  • File storage & document management                   │
│                                                         │
│  ✅ This layer gets MORE valuable, not less             │
└─────────────────────────────────────────────────────────┘
```

### How Value Is Shifting

```
BEFORE (Traditional SaaS):          AFTER (Agent Era):

  Human ──→ UI ──→ Data              Human
                                       │
                                    AI Agent        ← value moves UP
                                       │
                                  Protocol Layer    ← NEW LAYER
                                       │
                                   Application      ← gets squeezed
                                       │
                                      Data          ← value moves DOWN
```

### The Key Insight

The "Agent Interaction Protocol Layer" (WebMCP, MCP, APIs) is the critical new addition:

| Protocol                      | Scope                                       | Status                                    |
| ----------------------------- | ------------------------------------------- | ----------------------------------------- |
| **MCP** (Anthropic)           | Desktop apps, local tools, IDE integrations | Widely adopted, 2024-present              |
| **WebMCP** (Google/Microsoft) | Browser-based web applications              | W3C standard, Chrome 146 preview Feb 2026 |
| **REST/GraphQL APIs**         | Server-to-server, backend integrations      | Mature, existing                          |
| **OpenAPI/Tool schemas**      | LLM function calling                        | Mature, existing                          |

Together, these form the "agent interaction layer" that sits between AI agents and existing applications — the layer that Theo argues is needed for SaaS to survive in the agent era.

---

## Sources

- IDC: "Is SaaS Dead? Rethinking the Future of Software in the Age of AI"
- Bain & Company: "Will Agentic AI Disrupt SaaS?"
- Deloitte: "SaaS meets AI agents" (2026 predictions)
- Google/W3C: WebMCP specification
- Dataconomy: "Google's WebMCP Protocol: Everything You Need to Know"
- InformationWeek: "Is SaaS dead -- or just becoming AI?"
- SmartScope: "Structuring the 'SaaS is Dead' Debate"
