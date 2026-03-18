# MCP vs WebMCP — Complete Comparison

## TL;DR

MCP and WebMCP are **not competing protocols**. They are **complementary**. MCP is server-side (runs anywhere, no browser needed). WebMCP is browser-side (runs in Chrome, interacts with live web pages). The best products use both.

```
                    MCP                              WebMCP
               (Anthropic)                     (Google + Microsoft)

  WHERE:    Server / Desktop / Cloud           Browser (Chrome)
  WHO:      You deploy an MCP server           Website deploys HTML/JS
  HOW:      JSON-RPC over stdio/HTTP           navigator.modelContext API
  AGENT:    Claude Desktop, Cursor, etc.       Chrome's built-in agent
  SCOPE:    Any data, any system               Only what's in the browser tab
```

---

## Side-by-Side Comparison

```
┌──────────────────┬────────────────────────────┬────────────────────────────────┐
│                  │  MCP                       │  WebMCP                        │
│                  │  (Model Context Protocol)  │  (Web Model Context Protocol)  │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Created by       │ Anthropic (2024)           │ Google + Microsoft (2025)      │
│                  │                            │ W3C Community Group            │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Specification    │ Open protocol              │ W3C Draft Community Report     │
│                  │ modelcontextprotocol.io    │ webmachinelearning.github.io   │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Runs WHERE       │ Server-side / Desktop      │ Browser-side (client only)     │
│                  │ Any environment            │ Chrome tab (HTTPS only)        │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Core API         │ JSON-RPC 2.0               │ navigator.modelContext         │
│                  │ Tools, Resources, Prompts  │ registerTool() + HTML attrs    │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Transport        │ stdio (local)              │ N/A (in-browser, no network)   │
│                  │ Streamable HTTP (remote)   │                                │
│                  │ SSE (deprecated)           │                                │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Primitives       │ Tools (actions)            │ Tools only                     │
│                  │ Resources (read data)      │ (no Resources concept)         │
│                  │ Prompts (templates)        │ (no Prompts concept)           │
│                  │ Sampling (LLM requests)    │                                │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Who deploys it   │ You (the SaaS builder)     │ You (the website owner)        │
│                  │ As a server/process        │ As HTML attributes / JS code   │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Who hosts it     │ Your server / cloud /      │ The browser hosts it           │
│                  │ Cloudflare Workers / edge  │ (no hosting — it's client JS)  │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Agent connects   │ MCP Client (Claude Desktop,│ Chrome's built-in agent        │
│ via              │ Cursor, custom clients)    │ (reads navigator.modelContext) │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Backend access   │ DIRECT — calls your        │ INDIRECT — calls your frontend │
│                  │ service layer, DB, APIs    │ JS, which calls your API       │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Auth model       │ OAuth tokens, API keys,    │ User's existing browser        │
│                  │ custom auth headers        │ session, cookies, CSRF tokens  │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Session data     │ No access (server-side)    │ Full access — cookies, DOM,    │
│                  │                            │ localStorage, session state    │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Backend changes  │ YES — deploy MCP server,   │ ZERO — add HTML attrs or       │
│ needed           │ extract service layer      │ client-side JS only            │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Effort to add    │ 1-2 weeks                  │ 1-2 days (declarative)         │
│                  │                            │ 3-5 days (imperative)          │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Works without    │ YES — headless, no UI      │ NO — requires a browser tab    │
│ browser          │ needed                     │ with the website loaded        │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Status (Mar 2026)│ Widely adopted             │ Chrome 146 Canary early preview│
│                  │ 8,600+ community servers   │ Behind flag, not yet stable    │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Language/SDK     │ TypeScript, Python, Java,  │ JavaScript only (browser API)  │
│                  │ Rust, Go, .NET, etc.       │ + HTML attributes              │
├──────────────────┼────────────────────────────┼────────────────────────────────┤
│ Token efficiency │ Very high (structured      │ 89% improvement over           │
│                  │ JSON, no DOM parsing)      │ screenshot-based methods       │
└──────────────────┴────────────────────────────┴────────────────────────────────┘
```

---

## Architecture Diagrams

### MCP: How It Works End-to-End

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MCP ARCHITECTURE                                 │
│                                                                         │
│  ┌──────────────────────┐          ┌──────────────────────────────────┐ │
│  │     MCP HOST         │          │        MCP SERVER                │ │
│  │  (AI application)    │          │  (your deployed server)         │ │
│  │                      │          │                                  │ │
│  │  ┌────────────────┐  │          │  ┌────────────────────────────┐ │ │
│  │  │  LLM           │  │          │  │  Tools                     │ │ │
│  │  │  (Claude, GPT)  │  │          │  │  ├── create_campaign()    │ │ │
│  │  └────────┬───────┘  │          │  │  ├── list_segments()      │ │ │
│  │           │          │          │  │  └── get_performance()    │ │ │
│  │  ┌────────▼───────┐  │          │  ├────────────────────────────┤ │ │
│  │  │  MCP CLIENT    │◄─┼── JSON ──┼─►│  Resources                │ │ │
│  │  │  (one per      │  │   RPC    │  │  ├── analytics://dashboard │ │ │
│  │  │   server)      │  │   2.0    │  │  └── segments://all       │ │ │
│  │  └────────────────┘  │          │  ├────────────────────────────┤ │ │
│  │                      │          │  │  Prompts                   │ │ │
│  │  Can connect to      │          │  │  └── "win-back-campaign"  │ │ │
│  │  MULTIPLE servers    │          │  └────────────────────────────┘ │ │
│  └──────────────────────┘          │              │                  │ │
│                                    │              ▼                  │ │
│  TRANSPORT:                        │  ┌────────────────────────────┐ │ │
│                                    │  │  Your Service Layer        │ │ │
│  Local:  stdio ◄──────────────────►│  │  (business logic, DB,     │ │ │
│  (same machine, pipes)             │  │   external APIs)           │ │ │
│                                    │  └────────────────────────────┘ │ │
│  Remote: Streamable HTTP ◄────────►│                                  │ │
│  (over network, single endpoint)   └──────────────────────────────────┘ │
│                                                                         │
│  EXAMPLES OF MCP HOSTS:                                                 │
│  Claude Desktop, Cursor, Windsurf, VS Code + Copilot,                   │
│  Claude Code (CLI), custom agent applications                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### WebMCP: How It Works End-to-End

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       WebMCP ARCHITECTURE                               │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     CHROME BROWSER                                │  │
│  │                                                                   │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │  CHROME'S BUILT-IN  │    │     YOUR WEBSITE (loaded tab)    │  │  │
│  │  │  AI AGENT           │    │                                  │  │  │
│  │  │                     │    │  ┌─ Declarative API ───────────┐ │  │  │
│  │  │  Discovers tools    │    │  │                             │ │  │  │
│  │  │  registered via     │◄───│  │  <form toolname="..."      │ │  │  │
│  │  │  navigator          │    │  │        tooldescription="...│ │  │  │
│  │  │  .modelContext      │    │  │        toolautosubmit>     │ │  │  │
│  │  │                     │    │  │    <input name="query">    │ │  │  │
│  │  │  Reads tool         │    │  │  </form>                   │ │  │  │
│  │  │  contracts:         │    │  │                             │ │  │  │
│  │  │  - name             │    │  └─────────────────────────────┘ │  │  │
│  │  │  - description      │    │                                  │  │  │
│  │  │  - inputSchema      │    │  ┌─ Imperative API ────────────┐ │  │  │
│  │  │                     │    │  │                              │ │  │  │
│  │  │  Fills params and   │    │  │  navigator.modelContext     │ │  │  │
│  │  │  calls execute()    │───►│  │    .registerTool({          │ │  │  │
│  │  │                     │    │  │      name: "...",           │ │  │  │
│  │  │  Results come back  │◄───│  │      execute: async () => {│ │  │  │
│  │  │  as structured data │    │  │        // your JS code     │ │  │  │
│  │  │                     │    │  │        return { result }    │ │  │  │
│  │  └─────────────────────┘    │  │      }                     │ │  │  │
│  │                             │  │    })                       │ │  │  │
│  │                             │  │                              │ │  │  │
│  │                             │  └──────────────┬───────────────┘ │  │  │
│  │                             │                 │                 │  │  │
│  │                             │    execute() calls YOUR existing  │  │  │
│  │                             │    frontend code (fetch, stores)  │  │  │
│  │                             └────────────────┬─────────────────┘  │  │
│  └──────────────────────────────────────────────┼────────────────────┘  │
│                                                 │                       │
│  NO SPECIAL TRANSPORT — it's all in-browser JS  │  HTTP (fetch API)     │
│  The browser handles MCP protocol translation   │                       │
│                                                 ▼                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              YOUR EXISTING BACKEND (unchanged)                   │   │
│  │              API routes → Service layer → Database               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  KEY INSIGHT: WebMCP's execute() function runs YOUR frontend JS.        │
│  It calls the same fetch('/api/...') your React/Vue components call.    │
│  Your backend doesn't know (or care) if the request came from a         │
│  human clicking a button or an agent calling a WebMCP tool.             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Both Together: The Complete Picture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  THE COMPLETE AGENT INTERACTION SURFACE                     │
│                                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                    │
│  │  Claude      │   │  Cursor /    │   │  Chrome      │                    │
│  │  Desktop     │   │  VS Code     │   │  Agent       │                    │
│  │  (MCP host)  │   │  (MCP host)  │   │  (WebMCP)    │                    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                    │
│         │                  │                   │                            │
│         │  JSON-RPC        │  JSON-RPC         │  In-browser                │
│         │  (stdio/HTTP)    │  (stdio/HTTP)     │  (navigator.modelContext)  │
│         │                  │                   │                            │
│         ▼                  ▼                   ▼                            │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐     │
│  │        MCP SERVER               │   │       WebMCP TOOLS          │     │
│  │   (you deploy this)             │   │  (in your website's JS/HTML)│     │
│  │                                 │   │                             │     │
│  │  Capabilities:                  │   │  Capabilities:              │     │
│  │  ├── Tools (actions)            │   │  ├── Tools only             │     │
│  │  ├── Resources (read data)      │   │  │   (Declarative: forms)   │     │
│  │  ├── Prompts (templates)        │   │  │   (Imperative: JS)       │     │
│  │  └── Sampling (LLM calls)      │   │  │                          │     │
│  │                                 │   │  │  NO Resources            │     │
│  │  Access:                        │   │  │  NO Prompts              │     │
│  │  ├── Direct DB access           │   │  │                          │     │
│  │  ├── Backend APIs               │   │  │  Access:                 │     │
│  │  ├── External services          │   │  │  ├── Browser session     │     │
│  │  └── File system (local)        │   │  │  ├── Cookies, DOM        │     │
│  │                                 │   │  │  ├── Frontend JS/stores  │     │
│  │  Works: headless, no browser    │   │  │  └── fetch() to your API │     │
│  └──────────────┬──────────────────┘   │  │                          │     │
│                 │                      │  │  Works: browser tab only  │     │
│                 │                      └──┼──────────────────────────┘     │
│                 │                         │                                │
│                 ▼                         ▼                                │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                 YOUR SERVICE LAYER                                │      │
│  │           (both paths converge here)                              │      │
│  │                                                                   │      │
│  │   MCP server calls:  campaignService.create(params)               │      │
│  │   WebMCP calls:      fetch('/api/campaigns', { body: params })    │      │
│  │                      ↓ which hits your route handler              │      │
│  │                      ↓ which calls campaignService.create(params) │      │
│  │                                                                   │      │
│  │   SAME business logic, SAME validation, SAME result              │      │
│  └───────────────────────────────┬───────────────────────────────────┘      │
│                                  │                                          │
│                                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                    DATABASE + EXTERNAL SERVICES                   │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment & Hosting

### MCP Server: Where and How to Deploy

```
DEPLOYMENT OPTIONS FOR MCP SERVERS:

  ┌─────────────────────────────────────────────────────────────────────┐
  │  1. LOCAL (stdio transport)                                        │
  │                                                                     │
  │  Who: Developer using Claude Desktop / Cursor / Claude Code         │
  │  How: Node.js process spawned by the MCP host                       │
  │  Where: Developer's own machine                                     │
  │  Transport: stdin/stdout pipes                                      │
  │                                                                     │
  │  Best for:                                                          │
  │  ├── Personal tools, dev tools, IDE integrations                    │
  │  ├── File system access, local databases                            │
  │  ├── Low latency (same machine, no network)                         │
  │  └── Privacy-sensitive data (never leaves machine)                  │
  │                                                                     │
  │  Example config (Claude Desktop):                                   │
  │  {                                                                  │
  │    "mcpServers": {                                                  │
  │      "your-tool": {                                                 │
  │        "command": "node",                                           │
  │        "args": ["./dist/mcp-server.js"]                             │
  │      }                                                              │
  │    }                                                                │
  │  }                                                                  │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  2. REMOTE — Cloudflare Workers (recommended for production)       │
  │                                                                     │
  │  Who: SaaS builders deploying for many users                        │
  │  How: Wrangler CLI → deploy to Cloudflare edge                      │
  │  Where: Cloudflare's global edge network (300+ cities)              │
  │  Transport: Streamable HTTP (single endpoint)                       │
  │                                                                     │
  │  Best for:                                                          │
  │  ├── Production SaaS products                                       │
  │  ├── Multi-user (many agents connect to same server)                │
  │  ├── Global low latency (edge deployment)                           │
  │  ├── OAuth authentication built-in                                  │
  │  └── Free tier: 100K requests/day                                   │
  │                                                                     │
  │  URL: https://your-mcp.your-account.workers.dev/mcp                │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  3. REMOTE — Self-hosted (VPS, Docker, Kubernetes)                 │
  │                                                                     │
  │  Who: Teams needing full control                                    │
  │  How: Docker container, same process as your web app, or separate   │
  │  Where: Your cloud (AWS, GCP, Azure, Fly.io, Railway)              │
  │  Transport: Streamable HTTP                                         │
  │                                                                     │
  │  Best for:                                                          │
  │  ├── Co-located with your database (low latency queries)            │
  │  ├── Full infrastructure control                                    │
  │  ├── Integration with existing deployment pipeline                  │
  │  └── Data sovereignty requirements                                  │
  └─────────────────────────────────────────────────────────────────────┘
```

### WebMCP: Where and How to Deploy

```
WebMCP DEPLOYMENT (much simpler — it's just frontend code):

  ┌─────────────────────────────────────────────────────────────────────┐
  │  WebMCP lives IN your website. Deploying your website = deploying  │
  │  WebMCP. There is no separate server to host.                      │
  │                                                                     │
  │  DECLARATIVE (HTML attrs):                                          │
  │  ├── Add toolname/tooldescription to existing <form> tags           │
  │  ├── Deploy your website as usual (Vercel, Netlify, any host)       │
  │  └── Done. No infrastructure changes.                               │
  │                                                                     │
  │  IMPERATIVE (JavaScript):                                           │
  │  ├── Add navigator.modelContext.registerTool() calls to your JS     │
  │  ├── Bundle with your existing frontend build (Vite, webpack, etc.) │
  │  ├── Deploy your website as usual                                   │
  │  └── Done. No infrastructure changes.                               │
  │                                                                     │
  │  REQUIREMENT: HTTPS only (secure contexts)                          │
  │  BROWSER: Chrome 146+ with WebMCP flag enabled (early preview)      │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## When to Use Which

```
DECISION TREE:

  Does the agent need to work WITHOUT a browser?
  ├── YES → MCP (server-side)
  │         Agents like Claude Desktop, Cursor, CLI tools, automation
  │         scripts need MCP because there's no browser tab to read from.
  │
  └── NO → Does the agent need the user's active session/cookies?
           ├── YES → WebMCP (browser-side)
           │         The agent needs to act AS the logged-in user,
           │         using their session, seeing their data.
           │
           └── NO → MCP (server-side)
                    More reliable, faster, no browser overhead.

  TLDR FOR SAAS BUILDERS:
  ┌────────────────────────────────────────────────────────────────────┐
  │  Build BOTH. They serve different agent types:                    │
  │                                                                    │
  │  MCP server    = for programmatic agents (Claude Desktop,          │
  │                  automation, CI/CD, Slack bots, Zapier)             │
  │                  These agents don't have a browser.                │
  │                                                                    │
  │  WebMCP tools  = for browser agents (Chrome agent, assistants      │
  │                  that browse on behalf of users)                    │
  │                  These agents ARE in a browser with user context.  │
  │                                                                    │
  │  Both call your SAME service layer underneath.                     │
  └────────────────────────────────────────────────────────────────────┘
```

---

## How Your End-Users and Their Agents Interact With Your Service

This section maps every way a customer (end-user) of your SaaS product can interact with it — directly or through their AI agents.

### The Four Interaction Paths

```
YOUR END-USER ("Acme Corp marketing manager") wants to run a campaign.
They can do it four ways:

  PATH 1: Human → Your Dashboard (traditional)
  PATH 2: Human → Their Agent → Your MCP Server (agent-assisted, headless)
  PATH 3: Human → Their Agent → Your Website via WebMCP (agent-assisted, browser)
  PATH 4: Human → Their Agent → Your REST API (agent-assisted, API)

All four paths hit your SAME service layer and produce IDENTICAL results.
```

### Full Interaction Map

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   YOUR END-USER  (e.g., "Sarah, marketing manager at Acme Corp")                │
│   She has an account on your platform. She wants to run campaigns.               │
│                                                                                  │
│   She can interact with your service in 4 ways:                                  │
│                                                                                  │
├──────────┬──────────────────┬──────────────────┬────────────────────────────────┤
│          │                  │                  │                                │
│  PATH 1  │     PATH 2       │     PATH 3       │     PATH 4                    │
│  Human   │  Agent via MCP   │  Agent via WebMCP│  Agent via API                │
│  Direct  │  (headless)      │  (browser)       │  (HTTP)                       │
│          │                  │                  │                                │
│    👤     │    👤 → 🤖        │    👤 → 🤖        │    👤 → 🤖                     │
│    │      │         │        │         │        │         │                     │
│    │      │    ┌────▼─────┐  │    ┌────▼─────┐  │    ┌────▼─────┐              │
│    │      │    │ Claude   │  │    │ Chrome   │  │    │ Custom   │              │
│    │      │    │ Desktop  │  │    │ built-in │  │    │ agent /  │              │
│    │      │    │ Cursor   │  │    │ agent    │  │    │ script   │              │
│    │      │    │ Claude   │  │    │          │  │    │          │              │
│    │      │    │ Code     │  │    │ (in her  │  │    │ (calls   │              │
│    │      │    │          │  │    │  browser │  │    │  HTTP    │              │
│    │      │    │(MCP host)│  │    │  tab)    │  │    │  direct) │              │
│    │      │    └────┬─────┘  │    └────┬─────┘  │    └────┬─────┘              │
│    │      │         │        │         │        │         │                     │
│    │      │    JSON-RPC      │   navigator      │    HTTP request               │
│    │      │    (stdio or     │   .modelContext   │    (with API key              │
│    │      │    Streamable    │   (in-browser)    │     or OAuth token)           │
│    │      │    HTTP)         │                   │                               │
│    ▼      │         ▼        │         ▼         │         ▼                     │
│ ┌──────┐  │  ┌────────────┐  │  ┌────────────┐  │  ┌────────────┐              │
│ │ Your │  │  │ Your MCP   │  │  │ Your       │  │  │ Your       │              │
│ │ Web  │  │  │ Server     │  │  │ Website    │  │  │ REST API   │              │
│ │ UI   │  │  │            │  │  │ (WebMCP    │  │  │            │              │
│ │      │  │  │ Hosted on: │  │  │  tools     │  │  │ /api/...   │              │
│ │(React│  │  │ Cloudflare │  │  │  loaded)   │  │  │            │              │
│ │ Next │  │  │ Workers,   │  │  │            │  │  │            │              │
│ │ etc.)│  │  │ self-hosted│  │  │ execute()  │  │  │            │              │
│ └──┬───┘  │  └─────┬──────┘  │  │ calls      │  │  │            │              │
│    │      │        │         │  │ fetch()    │  │  │            │              │
│    │      │        │         │  │ to your API│  │  │            │              │
│    │      │        │         │  └─────┬──────┘  │  │            │              │
│    │      │        │         │        │         │  │            │              │
├────┼──────┴────────┼─────────┴────────┼─────────┴──┼────────────┘              │
│    │               │                  │            │                            │
│    ▼               ▼                  ▼            ▼                            │
│  ┌──────────────────────────────────────────────────────────────────────┐       │
│  │                    SHARED SCHEMAS (Zod)                               │       │
│  │          Same validation rules for ALL four paths                     │       │
│  └──────────────────────────────┬───────────────────────────────────────┘       │
│                                 │                                               │
│                                 ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐       │
│  │                     YOUR SERVICE LAYER                                │       │
│  │                                                                       │       │
│  │   campaignService.create(input)     ← ALL FOUR PATHS CALL THIS       │       │
│  │                                                                       │       │
│  │   Validates → Authorizes → Persists → Triggers side effects          │       │
│  └──────────────────────────────────────────────────────────────────────┘       │
│                                 │                                               │
│                                 ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐       │
│  │                     DATABASE + INTEGRATIONS                           │       │
│  └──────────────────────────────────────────────────────────────────────┘       │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Path-by-Path: What Actually Happens

#### PATH 1: Human Uses Your Dashboard Directly

```
Sarah opens your website → logs in → clicks "Create Campaign"

  ┌─────────────────────────────────────────────────────────┐
  │ STEP 1: Authentication                                   │
  │   Sarah goes to app.yourproduct.com                      │
  │   Logs in with email + password (or SSO)                 │
  │   Gets session cookie stored in browser                  │
  │                                                          │
  │ STEP 2: Navigate & Fill Forms                            │
  │   Clicks "Campaigns" → "New Campaign"                    │
  │   Selects segment from dropdown                          │
  │   Writes subject line & body                             │
  │   Clicks "Schedule" → picks a date                       │
  │                                                          │
  │ STEP 3: Submit                                           │
  │   Browser sends POST /api/campaigns                      │
  │   With session cookie (proves identity)                  │
  │   With CSRF token (proves it's her browser)              │
  │                                                          │
  │ STEP 4: Response                                         │
  │   UI shows "Campaign created!" with details              │
  │                                                          │
  │ Auth: session cookie + CSRF                              │
  │ Speed: depends on Sarah's clicks (~2-5 minutes)          │
  │ Limitation: Sarah does one campaign at a time            │
  └─────────────────────────────────────────────────────────┘
```

#### PATH 2: End-User's Agent Uses Your MCP Server (Headless)

```
Sarah tells Claude Desktop: "Run a win-back campaign for inactive users"

  ┌─────────────────────────────────────────────────────────┐
  │ STEP 1: Agent Discovery                                  │
  │   Sarah has your MCP server configured in her            │
  │   Claude Desktop (local) or connected via HTTP (remote)  │
  │   Agent reads your tool list: create_campaign,           │
  │   list_segments, get_performance, etc.                   │
  │                                                          │
  │ STEP 2: Authentication                                   │
  │   MCP server requires Sarah's API key or OAuth token     │
  │   (she set this up once during onboarding)               │
  │   Token identifies her tenant, scopes, and limits        │
  │                                                          │
  │ STEP 3: Agent Plans & Executes                           │
  │   Agent calls list_segments() → finds "inactive 30d"     │
  │   Agent calls create_campaign({                          │
  │     segment_id: "abc",                                   │
  │     channel: "email",                                    │
  │     subject: "We miss you!",                             │
  │     body: "...",                                         │
  │   })                                                     │
  │                                                          │
  │ STEP 4: MCP Server Processes                             │
  │   MCP server → validates token → calls service layer     │
  │   Service layer → same validation, same DB write         │
  │   Returns structured JSON to agent                       │
  │                                                          │
  │ STEP 5: Agent Reports Back                               │
  │   "I created a campaign targeting 2,341 inactive users.  │
  │    Subject: 'We miss you!' — scheduled for tomorrow."    │
  │                                                          │
  │ Auth: OAuth token / API key (per-user)                   │
  │ Speed: ~5 seconds (no UI rendering, no clicks)           │
  │ Power: Agent can chain 10 tools in a row autonomously    │
  └─────────────────────────────────────────────────────────┘

  HOW SARAH SET UP MCP ACCESS (one-time):

    Option A — Local (Claude Desktop):
    Sarah adds to her claude_desktop_config.json:
    {
      "mcpServers": {
        "yourproduct": {
          "command": "npx",
          "args": ["yourproduct-mcp"],
          "env": { "API_KEY": "sk_sarah_xxxxx" }
        }
      }
    }

    Option B — Remote (any MCP client):
    Sarah connects to:
    https://mcp.yourproduct.com/mcp
    With OAuth flow that grants her agent scoped access
```

#### PATH 3: End-User's Agent Uses WebMCP (Browser)

```
Sarah is on your website. Chrome's agent says: "I can help with that."

  ┌─────────────────────────────────────────────────────────┐
  │ STEP 1: Sarah is Already Logged In                       │
  │   She's browsing your dashboard in Chrome                │
  │   She's authenticated (session cookie active)            │
  │   Chrome detects WebMCP tools on the page                │
  │                                                          │
  │ STEP 2: Agent Discovery (automatic)                      │
  │   Chrome's built-in agent reads:                         │
  │   - <form toolname="create_campaign" ...> (declarative)  │
  │   - navigator.modelContext registered tools (imperative)  │
  │   Agent now knows what actions are available              │
  │                                                          │
  │ STEP 3: Sarah Asks the Agent                             │
  │   "Create a win-back campaign for my inactive users"     │
  │   (via Chrome's agent interface — like an assistant       │
  │    that can see and interact with the current page)       │
  │                                                          │
  │ STEP 4: Agent Executes (in browser context)              │
  │   Agent calls the registered WebMCP tool:                │
  │   execute({ segment_id: "abc", channel: "email", ... })  │
  │                                                          │
  │   Inside execute(), YOUR JS runs:                        │
  │   → fetch('/api/campaigns', { method: 'POST', body })    │
  │   → Uses Sarah's EXISTING session cookie automatically   │
  │   → Backend can't tell it's an agent (same auth)         │
  │                                                          │
  │ STEP 5: Page Updates + Agent Responds                    │
  │   Your website UI updates (campaign appears in list)     │
  │   Agent says: "Done! Campaign created for 2,341 users."  │
  │                                                          │
  │ Auth: Sarah's existing browser session (cookies, CSRF)   │
  │ Speed: ~3 seconds (fetch call, no page navigation)       │
  │ Advantage: Agent sees Sarah's EXACT context — her data,  │
  │   her permissions, her current page state                 │
  └─────────────────────────────────────────────────────────┘

  KEY DIFFERENCE FROM PATH 2:
  ┌─────────────────────────────────────────────────────────┐
  │ WebMCP agent acts AS Sarah, in her browser session.     │
  │ MCP agent acts ON BEHALF OF Sarah, with its own token.  │
  │                                                          │
  │ WebMCP sees: Sarah's dashboard, her notifications,      │
  │   her draft campaigns, her specific view of the data.   │
  │                                                          │
  │ MCP sees: Sarah's data via API, scoped by her token.    │
  │   No browser context, no page state, no visual UI.      │
  └─────────────────────────────────────────────────────────┘
```

#### PATH 4: End-User's Agent Uses Your REST API Directly

```
Sarah's custom automation script calls your API

  ┌─────────────────────────────────────────────────────────┐
  │ STEP 1: Sarah Has an API Key                             │
  │   Generated from your dashboard → Settings → API Keys    │
  │   Key is scoped to her tenant with permissions            │
  │                                                          │
  │ STEP 2: Agent/Script Calls Your API                      │
  │   POST https://api.yourproduct.com/api/campaigns         │
  │   Headers: { Authorization: "Bearer sk_sarah_xxxxx" }    │
  │   Body: { segment_id, channel, subject, body }           │
  │                                                          │
  │ STEP 3: Your API Processes                               │
  │   Route handler → validates input → calls service layer  │
  │   Same service, same validation, same DB write           │
  │                                                          │
  │ STEP 4: JSON Response                                    │
  │   { id: "camp_123", status: "draft", segment_size: 2341 }│
  │                                                          │
  │ Auth: API key or OAuth token (Bearer header)             │
  │ Speed: ~2 seconds (direct HTTP, minimal overhead)        │
  │ Use case: Zapier, Make, n8n, custom scripts, cron jobs   │
  │                                                          │
  │ Note: This is the "traditional" path. MCP and WebMCP     │
  │ are higher-level protocols that WRAP this capability      │
  │ with richer semantics (tool descriptions, discovery,     │
  │ resources, prompts).                                     │
  └─────────────────────────────────────────────────────────┘
```

### Authentication Comparison Across All Paths

```
┌──────────────┬─────────────────────┬──────────────────────────────────────┐
│ Path         │ Auth Mechanism       │ Who Sets It Up / When                │
├──────────────┼─────────────────────┼──────────────────────────────────────┤
│ 1. Human UI  │ Session cookie      │ User logs in each session            │
│              │ + CSRF token         │ (or SSO, "remember me")             │
├──────────────┼─────────────────────┼──────────────────────────────────────┤
│ 2. MCP       │ OAuth token or      │ One-time setup: user generates      │
│    Server    │ API key in env/     │ API key in dashboard, or completes  │
│              │ config              │ OAuth flow in MCP client             │
│              │                     │                                      │
│              │ Token carries:       │ Scopes: which tools are allowed     │
│              │ tenant_id, scopes,  │ Limits: max emails/day, budget      │
│              │ rate limits         │ Set by you (the SaaS builder)       │
├──────────────┼─────────────────────┼──────────────────────────────────────┤
│ 3. WebMCP    │ User's existing     │ Nothing extra! User is already      │
│    (browser) │ browser session     │ logged in. Agent inherits their     │
│              │ (cookies)           │ session automatically.              │
│              │                     │                                      │
│              │                     │ ⚠ This means WebMCP agents have    │
│              │                     │ the SAME permissions as the user.   │
│              │                     │ No separate agent scoping.          │
├──────────────┼─────────────────────┼──────────────────────────────────────┤
│ 4. REST API  │ API key or OAuth    │ User generates key in dashboard,    │
│              │ Bearer token        │ or uses OAuth client credentials    │
└──────────────┴─────────────────────┴──────────────────────────────────────┘
```

### Agent Discovery: How Agents Find Your Tools

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DISCOVERY — How does an agent know what tools you offer?                │
│                                                                         │
│  PATH 2 (MCP):                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Agent connects to MCP server (stdio or HTTP)                  │  │
│  │ 2. Sends initialize request                                      │  │
│  │ 3. Server responds with capabilities (tools, resources, prompts) │  │
│  │ 4. Agent sends tools/list request                                │  │
│  │ 5. Server returns full tool catalog with names, descriptions,    │  │
│  │    and input schemas (Zod/JSON Schema)                           │  │
│  │ 6. Agent now knows exactly what it can do                        │  │
│  │                                                                   │  │
│  │ Discovery is EXPLICIT — server tells the agent everything.       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  PATH 3 (WebMCP):                                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. User navigates to your website in Chrome                      │  │
│  │ 2. Page loads, HTML forms with toolname attrs are parsed         │  │
│  │ 3. JavaScript runs, registerTool() calls register imperative     │  │
│  │    tools with navigator.modelContext                             │  │
│  │ 4. Chrome's agent reads all registered tools from the page       │  │
│  │ 5. Agent now knows what it can do ON THIS PAGE                   │  │
│  │                                                                   │  │
│  │ Discovery is PAGE-SCOPED — agent only sees tools on the          │  │
│  │ current page. Navigate to a different page → different tools.    │  │
│  │                                                                   │  │
│  │ ⚠ Unlike MCP, there's no global tool catalog. Each page         │  │
│  │   exposes its own subset of tools.                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  PATH 4 (REST API):                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Agent reads your OpenAPI spec (if available)                  │  │
│  │    e.g., https://api.yourproduct.com/openapi.json                │  │
│  │ 2. Or: LLM function calling uses tool definitions provided by   │  │
│  │    the developer who set up the agent                            │  │
│  │ 3. No standard discovery protocol — relies on documentation     │  │
│  │                                                                   │  │
│  │ Discovery is MANUAL — someone has to wire up the tool schemas.   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Real-World Scenario: Sarah's Day Using All Paths

```
MORNING — Sarah uses PATH 2 (MCP via Claude Desktop):
  "Claude, give me a performance report for all campaigns this week"
  → Agent calls get_performance() via MCP
  → Agent composes a summary in natural language
  → Sarah reads it while drinking coffee (no dashboard opened)

MIDDAY — Sarah uses PATH 3 (WebMCP via Chrome):
  Sarah is browsing her dashboard, reviewing campaign results.
  Chrome agent: "I notice your 'Spring Sale' segment has 40% open rate.
  Want me to create a follow-up for users who opened but didn't convert?"
  → Agent calls create_campaign() via WebMCP
  → Uses Sarah's logged-in session, sees her exact dashboard state
  → Campaign appears in her UI immediately

AFTERNOON — Sarah's automation uses PATH 4 (REST API):
  Sarah has a Zapier workflow: "When Stripe records a new subscription,
  add the user to the 'New Customers' segment in YourProduct"
  → Zapier calls POST /api/segments/new-customers/members
  → Uses Sarah's API key (configured once in Zapier)
  → Runs automatically, no human involved

EVENING — Sarah uses PATH 1 (direct UI):
  Sarah wants to review and approve a large campaign (10K+ users)
  that her agent created. She opens the dashboard, reviews the
  content, checks the segment, and clicks "Approve & Send."
  → Human-in-the-loop for high-stakes actions
```

### What You (The SaaS Builder) Must Build For Each Path

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│ PATH     │ WHAT YOU BUILD                                             │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 1. UI    │ ╔═══════════════════════════════════════════════════════╗   │
│          │ ║ You probably already have this.                      ║   │
│          │ ║ React/Next.js/Vue dashboard, login flow, forms.     ║   │
│          │ ╚═══════════════════════════════════════════════════════╝   │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 2. MCP   │ ┌───────────────────────────────────────────────────────┐  │
│ Server   │ │ BUILD: MCP server (TypeScript, ~200-500 lines)       │  │
│          │ │                                                       │  │
│          │ │ New files:                                             │  │
│          │ │ ├── mcp/server.ts    (tool registrations)             │  │
│          │ │ ├── mcp/index.ts     (transport setup)                │  │
│          │ │ └── auth/agent-auth  (OAuth/API key validation)       │  │
│          │ │                                                       │  │
│          │ │ Reuse:                                                 │  │
│          │ │ ├── schemas/*        (shared Zod schemas)             │  │
│          │ │ └── services/*       (existing service layer)         │  │
│          │ │                                                       │  │
│          │ │ Deploy:                                                │  │
│          │ │ ├── Cloudflare Workers (recommended, free tier)       │  │
│          │ │ ├── Same server as your app (Option A, simplest)      │  │
│          │ │ └── npm package user installs locally (Option C)      │  │
│          │ │                                                       │  │
│          │ │ User setup: API key in settings → paste into agent    │  │
│          │ └───────────────────────────────────────────────────────┘  │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 3. WebMCP│ ┌───────────────────────────────────────────────────────┐  │
│          │ │ BUILD: HTML attributes + JS on your existing website  │  │
│          │ │                                                       │  │
│          │ │ Changes:                                               │  │
│          │ │ ├── Add toolname/tooldescription to existing forms    │  │
│          │ │ ├── Add registerTool() JS for complex workflows      │  │
│          │ │ └── That's it. No new files, no new servers.         │  │
│          │ │                                                       │  │
│          │ │ Deploy: deploy your website as normal                  │  │
│          │ │ User setup: NONE — they just use Chrome               │  │
│          │ └───────────────────────────────────────────────────────┘  │
├──────────┼─────────────────────────────────────────────────────────────┤
│ 4. API   │ ╔═══════════════════════════════════════════════════════╗   │
│          │ ║ You probably already have this.                      ║   │
│          │ ║ Add: rich descriptions to OpenAPI spec.              ║   │
│          │ ║ Add: API key generation in user settings page.      ║   │
│          │ ╚═══════════════════════════════════════════════════════╝   │
└──────────┴─────────────────────────────────────────────────────────────┘
```

### The Guardrails Matrix: Protecting Against Agent Misuse

```
When Sarah's agent acts on her behalf, what prevents it from going rogue?

  ┌──────────────┬───────────────────────────────────┬──────────────────────┐
  │ Guardrail    │ MCP Server (PATH 2)               │ WebMCP (PATH 3)      │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Rate limits  │ YOU implement in MCP server       │ Your API rate limits │
  │              │ (max 10 campaigns/day per token)  │ apply (same as UI)   │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Budget caps  │ YOU implement in service layer    │ Same service layer   │
  │              │ (max $500 email spend/day)        │ caps apply           │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Scope limits │ OAuth scopes per token            │ N/A — agent has same │
  │              │ (tool:create_campaign but NOT     │ permissions as the   │
  │              │  tool:delete_account)             │ logged-in user       │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Approval     │ Service layer returns             │ Same service layer   │
  │ gates        │ "pending_approval" for campaigns  │ gates apply — UI    │
  │              │ targeting >10K users              │ shows approval modal │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Audit trail  │ YOU log: agent_id, tool, params,  │ Your existing API   │
  │              │ human_id, timestamp               │ logs capture it     │
  │              │ (dedicated agent audit log)       │ (looks like normal  │
  │              │                                   │  user requests)     │
  ├──────────────┼───────────────────────────────────┼──────────────────────┤
  │ Revocation   │ Revoke OAuth token / API key      │ Log user out of     │
  │              │ (instant, granular)               │ browser session     │
  └──────────────┴───────────────────────────────────┴──────────────────────┘

  ⚠ KEY INSIGHT:
  WebMCP inherits the user's FULL session — there's no separate
  agent permission model. This is simpler but less controllable.
  MCP gives you granular agent-specific scopes and limits.

  For high-stakes SaaS (marketing, financial, medical):
  → MCP server with explicit agent authorization is safer
  → WebMCP is better for read-heavy, low-risk interactions
```

---

## How to Test WebMCP Right Now (March 2026)

### Step 1: Enable WebMCP in Chrome Canary

```
1. Download Chrome Canary (or Chrome Beta 146+)
   https://www.google.com/chrome/canary/

2. Navigate to:   chrome://flags/#enable-webmcp-testing

3. Set "WebMCP Testing" to "Enabled"

4. Click "Relaunch"

5. Verify it works:
   → Open any HTTPS site
   → Open DevTools (F12) → Console
   → Type: "modelContext" in navigator
   → Should return: true
```

### Step 2: Test With a Simple HTML Page

Create a local test page to verify WebMCP tools work:

```html
<!-- test-webmcp.html — serve over HTTPS (required) -->
<!DOCTYPE html>
<html>
<head><title>WebMCP Test</title></head>
<body>
  <h1>WebMCP Test Page</h1>

  <!-- DECLARATIVE: form-based tool -->
  <form toolname="greet_user"
        tooldescription="Greet a user by name. Returns a personalized greeting."
        toolautosubmit="true"
        action="/api/greet" method="POST">
    <input name="user_name" type="text" placeholder="Enter name" required>
    <button type="submit">Greet</button>
  </form>

  <!-- IMPERATIVE: JS-based tool -->
  <script>
    if ("modelContext" in navigator) {
      navigator.modelContext.registerTool({
        name: "calculate_sum",
        description: "Add two numbers together and return the result.",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "number", description: "First number" },
            b: { type: "number", description: "Second number" },
          },
          required: ["a", "b"],
        },
        async execute({ a, b }) {
          return { result: a + b };
        },
      });

      console.log("WebMCP tools registered successfully!");
    } else {
      console.warn("WebMCP not available — enable the Chrome flag");
    }
  </script>
</body>
</html>
```

To serve locally over HTTPS (required by WebMCP):
```bash
# Option A: use a quick local HTTPS server
npx serve --ssl       # serves current directory over HTTPS

# Option B: use Vite (if you have a project)
npm create vite@latest webmcp-test && cd webmcp-test
# copy the HTML above into index.html
npm run dev -- --https
```

### Step 3: Inspect Registered Tools

Install the **Model Context Tool Inspector Extension**:
- Available on Chrome Web Store
- Shows all WebMCP tools registered on the current page
- Lets you execute tools manually with custom parameters
- Supports testing with Gemini API

Or use DevTools Console directly:
```javascript
// List all registered tools on the current page
const tools = await navigator.modelContext.getTools();
console.log(tools);

// Manually call a tool
const result = await navigator.modelContext.callTool("calculate_sum", { a: 5, b: 3 });
console.log(result); // { result: 8 }
```

### The Tampermonkey Approach: Inject WebMCP Into ANY Website

**Yes, this works.** You can use Tampermonkey to inject `navigator.modelContext.registerTool()` calls into websites you don't control. This lets you make ANY website agent-ready without modifying its source code.

```
HOW IT WORKS:

  ┌─────────────────────────────────────────────────────────────┐
  │                    CHROME BROWSER                            │
  │                                                              │
  │  ┌──────────────┐                                           │
  │  │ Tampermonkey  │ ──→ Injects userscript into page         │
  │  │ Extension     │     BEFORE or AFTER page loads            │
  │  └──────────────┘                                           │
  │          │                                                   │
  │          ▼                                                   │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │         YOUR EXISTING WEBSITE (any site)             │    │
  │  │                                                      │    │
  │  │  Page loads normally (site owner's code runs)        │    │
  │  │          +                                           │    │
  │  │  Tampermonkey script runs:                           │    │
  │  │    navigator.modelContext.registerTool({              │    │
  │  │      name: "search_products",                        │    │
  │  │      execute: async (params) => {                    │    │
  │  │        // interact with the page's DOM / JS          │    │
  │  │        // call the site's own API endpoints          │    │
  │  │        // return structured data                     │    │
  │  │      }                                               │    │
  │  │    })                                                │    │
  │  │                                                      │    │
  │  │  Now Chrome's agent can call "search_products"!      │    │
  │  └─────────────────────────────────────────────────────┘    │
  │                                                              │
  │  ┌──────────────┐                                           │
  │  │ Chrome Agent  │ ──→ Discovers injected tools              │
  │  │ or WebClaw    │     and can call them                     │
  │  └──────────────┘                                           │
  └─────────────────────────────────────────────────────────────┘
```

#### Tampermonkey Userscript Example

```javascript
// ==UserScript==
// @name         WebMCP Tools for ExampleApp
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Inject WebMCP tools into an existing web app
// @match        https://app.example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // Wait for WebMCP API to be available
    if (!("modelContext" in navigator)) {
        console.warn("[WebMCP Inject] WebMCP not available — enable Chrome flag");
        return;
    }

    // TOOL 1: Search the site's product catalog
    navigator.modelContext.registerTool({
        name: "search_products",
        description:
            "Search the product catalog on this site. " +
            "Returns matching products with names, prices, and IDs.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search term for products",
                },
                category: {
                    type: "string",
                    description: "Optional category filter",
                },
            },
            required: ["query"],
        },
        async execute({ query, category }) {
            // Call the SITE'S OWN API (using the user's logged-in session)
            const url = new URL("/api/products/search", window.location.origin);
            url.searchParams.set("q", query);
            if (category) url.searchParams.set("category", category);

            const res = await fetch(url);
            const data = await res.json();
            return { result: data };
        },
    });

    // TOOL 2: Add item to cart (interact with existing page JS)
    navigator.modelContext.registerTool({
        name: "add_to_cart",
        description:
            "Add a product to the shopping cart. " +
            "Requires a product_id from search_products results.",
        inputSchema: {
            type: "object",
            properties: {
                product_id: { type: "string", description: "Product ID to add" },
                quantity: {
                    type: "number",
                    description: "Quantity (default 1)",
                    default: 1,
                },
            },
            required: ["product_id"],
        },
        async execute({ product_id, quantity = 1 }) {
            // Call the site's cart API (session cookie handles auth)
            const res = await fetch("/api/cart/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id, quantity }),
            });
            const data = await res.json();

            // Optionally update the UI (cart badge, etc.)
            const cartBadge = document.querySelector(".cart-count");
            if (cartBadge) cartBadge.textContent = data.total_items;

            return { result: data };
        },
    });

    // TOOL 3: Read page data (scrape structured info from DOM)
    navigator.modelContext.registerTool({
        name: "get_current_page_info",
        description:
            "Get structured information about the current page — " +
            "product details, prices, reviews, breadcrumbs.",
        inputSchema: { type: "object", properties: {} },
        async execute() {
            // Extract data from the DOM
            const title = document.querySelector("h1")?.textContent?.trim();
            const price = document.querySelector(".price")?.textContent?.trim();
            const reviews = document.querySelector(".review-count")?.textContent?.trim();
            const breadcrumbs = [...document.querySelectorAll(".breadcrumb a")].map(
                (a) => a.textContent.trim()
            );

            return {
                result: {
                    title,
                    price,
                    reviews,
                    breadcrumbs,
                    url: window.location.href,
                },
            };
        },
    });

    console.log("[WebMCP Inject] 3 tools registered for", window.location.hostname);
})();
```

#### Tampermonkey Key Settings

```javascript
// CRITICAL: Use @grant none to run in the page's context
// This gives you access to:
// - navigator.modelContext (WebMCP API)
// - The page's own JavaScript (window.*, stores, etc.)
// - The page's fetch() with session cookies
// - The page's DOM

// @grant        none       ← REQUIRED for WebMCP access
// @run-at       document-idle  ← run after page fully loads
// @match        https://app.example.com/*  ← which sites to inject into
```

### Can Claude in Chrome Use WebMCP Tools?

**Not yet natively, but it's coming.** Here's the current state:

```
┌──────────────────────────────────────────────────────────────────────┐
│ AGENT                        │ WebMCP Support    │ Status            │
├──────────────────────────────┼───────────────────┼───────────────────┤
│ Chrome's built-in agent      │ YES (native)      │ Early preview     │
│ (Gemini-powered)             │                   │ Chrome 146 Canary │
├──────────────────────────────┼───────────────────┼───────────────────┤
│ Claude in Chrome extension   │ NOT YET           │ Feature requested │
│ (Anthropic)                  │ Uses computer_use │ github issue      │
│                              │ (screenshots)     │ #30645            │
├──────────────────────────────┼───────────────────┼───────────────────┤
│ WebClaw extension            │ YES (bridge)      │ Available now     │
│ (community)                  │ WebMCP → MCP      │ github.com/       │
│                              │ bridge for Claude,│ kuroko1t/webclaw  │
│                              │ Cursor, any MCP   │                   │
│                              │ client            │                   │
├──────────────────────────────┼───────────────────┼───────────────────┤
│ Model Context Tool Inspector │ YES (testing)     │ Available now     │
│ (Chrome extension)           │ Manual tool       │ Chrome Web Store  │
│                              │ execution + Gemini│                   │
├──────────────────────────────┼───────────────────┼───────────────────┤
│ keak-ai/webmcp-core          │ YES (generator)   │ Available now     │
│ (npm package)                │ Auto-generates    │ npm install       │
│                              │ tool definitions  │                   │
│                              │ for ANY website   │                   │
└──────────────────────────────┴───────────────────┴───────────────────┘
```

### WebClaw: Bridge WebMCP to Claude/Cursor Right Now

WebClaw is the current best path to make Claude interact with WebMCP tools:

```
HOW WEBCLAW BRIDGES WebMCP → MCP:

  ┌─────────────────────────────────────────────────────────┐
  │                    CHROME BROWSER                        │
  │                                                          │
  │  ┌──────────────┐        ┌──────────────────────────┐   │
  │  │   WebClaw     │        │  Your Website            │   │
  │  │   Extension   │◄──────►│  (with WebMCP tools      │   │
  │  │              │  reads  │   registered via site JS  │   │
  │  │  Exposes all  │  tools │   or Tampermonkey)        │   │
  │  │  WebMCP tools │        │                          │   │
  │  │  as MCP tools │        └──────────────────────────┘   │
  │  └──────┬───────┘                                        │
  │         │ WebSocket (localhost)                           │
  └─────────┼────────────────────────────────────────────────┘
            │
            ▼
  ┌─────────────────────┐
  │  WebClaw MCP Server │  ← translates WebMCP → MCP protocol
  │  (localhost:18080)   │
  └─────────┬───────────┘
            │ stdio / HTTP
            ▼
  ┌─────────────────────┐
  │  Claude Desktop     │  ← or Cursor, VS Code, any MCP client
  │  Claude Code        │
  │  Any MCP host       │
  └─────────────────────┘

  RESULT: Claude can call WebMCP tools registered on any page,
  including tools YOU injected via Tampermonkey!
```

### keak-ai/webmcp-core: Auto-Generate Tools for Any Site

Instead of manually writing Tampermonkey scripts, you can auto-scan a website:

```bash
# Scan any website and generate WebMCP tool definitions
npx @keak/webmcp-core generate https://app.example.com

# What it does:
# 1. Crawls the site
# 2. Finds every form, API call, and interactive element
# 3. Outputs structured tool definitions
# 4. Supports both declarative (HTML attrs) and imperative (registerTool)
```

This generates tool definitions you can then inject via Tampermonkey or include in your website's source code.

### Practical Testing Workflow for Solo Builders

```
YOUR TESTING WORKFLOW:

  STEP 1: Enable WebMCP in Chrome Canary
          chrome://flags/#enable-webmcp-testing → Enabled → Relaunch

  STEP 2: Choose your approach:

    ┌─ OPTION A: You OWN the website ─────────────────────────────┐
    │                                                              │
    │  Add registerTool() calls to your source code                │
    │  → Deploy → Test in Chrome Canary                            │
    │  → Use Model Context Tool Inspector to debug                │
    │  → Use WebClaw to test with Claude Desktop                   │
    │                                                              │
    │  BEST FOR: building agent-native from scratch                │
    └──────────────────────────────────────────────────────────────┘

    ┌─ OPTION B: You DON'T own the website (or want to prototype) ┐
    │                                                              │
    │  Write Tampermonkey userscript with registerTool() calls     │
    │  → Install in Chrome Canary                                  │
    │  → Navigate to the target site                               │
    │  → Tools appear in Model Context Tool Inspector              │
    │  → Use WebClaw to test with Claude Desktop                   │
    │                                                              │
    │  BEST FOR: prototyping, testing on existing sites,           │
    │  proving the concept before modifying source code            │
    └──────────────────────────────────────────────────────────────┘

    ┌─ OPTION C: Auto-generate tools for any site ─────────────────┐
    │                                                              │
    │  npx @keak/webmcp-core generate https://app.example.com     │
    │  → Review generated tool definitions                         │
    │  → Paste into Tampermonkey script or your source code        │
    │  → Test as above                                             │
    │                                                              │
    │  BEST FOR: retrofitting large existing sites quickly          │
    └──────────────────────────────────────────────────────────────┘

  STEP 3: Test with real agents
    → Model Context Tool Inspector (manual execution)
    → WebClaw + Claude Desktop (full AI agent interaction)
    → Chrome's built-in agent (if available in your Canary build)
```

---

## Key Technologies Summary

```
MCP TECHNOLOGY STACK:

  Protocol:     JSON-RPC 2.0
  SDK:          @modelcontextprotocol/sdk (TypeScript/Python/etc.)
  Validation:   Zod (TypeScript) / Pydantic (Python)
  Transport:    stdio (local) / Streamable HTTP (remote)
  Auth:         OAuth 2.0, API keys, custom headers
  Hosting:      Cloudflare Workers, self-hosted, same-process
  Inspector:    @modelcontextprotocol/inspector (debug tool)
  Ecosystem:    8,600+ community servers (as of early 2026)

WebMCP TECHNOLOGY STACK:

  Standard:     W3C Draft Community Group Report
  Browser API:  navigator.modelContext
  Declarative:  HTML attributes (toolname, tooldescription, toolautosubmit)
  Imperative:   JavaScript (registerTool(), execute())
  Auth:         Browser session (cookies, CSRF, existing auth)
  Hosting:      Your website (no separate hosting needed)
  Schema:       JSON Schema (for inputSchema in imperative API)
  Browser:      Chrome 146+ Canary (behind flag, early preview)
  Conversion:   zod-to-json-schema (to share schemas between MCP and WebMCP)
```

---

## Sources

- [When to use WebMCP and MCP — Chrome for Developers](https://developer.chrome.com/blog/webmcp-mcp-usage)
- [WebMCP is available for early preview — Chrome for Developers](https://developer.chrome.com/blog/webmcp-epp)
- [MCP Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Transports](https://modelcontextprotocol.io/legacy/concepts/transports)
- [WebMCP W3C Spec](https://webmachinelearning.github.io/webmcp/)
- [Build a Remote MCP server — Cloudflare](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [WebMCP vs MCP — Capsolver](https://www.capsolver.com/blog/AI/webmcp-vs-mcp)
- [Chrome WebMCP Complete 2026 Guide — DEV Community](https://dev.to/czmilo/chrome-webmcp-the-complete-2026-guide-to-ai-agent-protocol-1ae9)
- [MCP Transport Protocols Comparison — MCPcat](https://mcpcat.io/guides/comparing-stdio-sse-streamablehttp/)
- [Why MCP Deprecated SSE — fka.dev](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
- [Enable WebMCP in Chrome 146 — SalamExperts](https://www.salamexperts.com/blog/ai/enable-webmcp-chrome/)
- [WebClaw — WebMCP-native browser agent for Claude/Cursor](https://github.com/kuroko1t/webclaw)
- [keak-ai/webmcp-core — Auto-generate WebMCP tools](https://github.com/keak-ai/webmcp-core)
- [Claude in Chrome WebMCP feature request — GitHub #30645](https://github.com/anthropics/claude-code/issues/30645)
- [Chrome's WebMCP Early Preview — DEV Community](https://dev.to/axrisi/chromes-webmcp-early-preview-the-end-of-ai-agents-clicking-buttons-b6e)
