// ==UserScript==
// @name         Silly Count — WebMCP Agent Tools
// @namespace    https://silly-count.harrycorn.com
// @version      2.1.0
// @description  Enables WebMCP tools on Silly Count. Uses DOM attribute bridge to work around Chrome's isolated world restriction. Only work in list view
// @match        https://silly-count.harrycorn.com/*
// @grant        none
// @run-at       document-idle
// @inject-into  page
// ==/UserScript==

(function () {
    'use strict';

    // ──────────────────────────────────────────────────────────────────
    // ARCHITECTURE: DOM Attribute Bridge
    //
    // Problem: WebMCP execute() runs in Chrome's isolated JavaScript world.
    //   It can find DOM elements via querySelectorAll, but textContent
    //   and innerText return empty strings. This means we can't parse
    //   the page inside execute().
    //
    // Solution:
    //   1. MAIN WORLD (this Tampermonkey script): Parse counter data
    //      from the DOM and store it as a JSON string in a data attribute
    //      on document.body: body.dataset.webmcpCounters = JSON.stringify(...)
    //   2. MutationObserver keeps the attribute updated on DOM changes.
    //   3. ISOLATED WORLD (WebMCP execute): Reads the data attribute
    //      which IS accessible across worlds, and parses the JSON.
    //   4. For button clicks: we store button references by index and
    //      the execute function finds buttons by aria-label or text match.
    // ──────────────────────────────────────────────────────────────────

    if (!('modelContext' in navigator)) {
        console.warn(
            '[Silly Count WebMCP] WebMCP not available. Enable: chrome://flags/#enable-webmcp-testing',
        );
        return;
    }

    function getUsername() {
        return window.location.pathname.match(/^\/([^/]+)/)?.[1] || null;
    }

    // ─── MAIN WORLD: Parse counters and store on DOM attribute ──────

    function parseAndStoreCounters() {
        const cards = document.querySelectorAll("div[class*='bg-card']");
        const counters = [];

        cards.forEach((card, index) => {
            const text = card.textContent || '';
            if (text.length < 10 || text.length > 800) return;
            if (!text.includes('Edit') && !text.includes('Archive')) return;

            // Type & sentiment
            const isBudget = text.includes('Budget');
            const isGuilty = text.includes('Guilty');
            const isGood = text.includes('Good');
            const type = isBudget ? 'budget' : 'count';
            const sentiment = isGuilty ? 'guilty' : isGood ? 'good' : 'neutral';

            // Frequency
            const freqMatch = text.match(/\b(daily|weekly|monthly)\b/i);
            const frequency = freqMatch
                ? freqMatch[1].toLowerCase()
                : 'unknown';

            // Count & quota
            let current = 0,
                quota = 0;
            if (isBudget) {
                const m = text.match(/([\d,]+)\s*of\s*([\d,]+)/);
                if (m) {
                    current = parseInt(m[1].replace(/,/g, ''), 10);
                    quota = parseInt(m[2].replace(/,/g, ''), 10);
                }
            } else {
                const m = text.match(/(\d+)\s*\/\s*(\d+)/);
                if (m) {
                    current = parseInt(m[1], 10);
                    quota = parseInt(m[2], 10);
                }
            }

            // Title & emoji via leaf text nodes
            let title = '',
                emoji = '';
            const walker = document.createTreeWalker(
                card,
                NodeFilter.SHOW_TEXT,
            );
            const leafs = [];
            let node;
            while ((node = walker.nextNode())) {
                const t = node.textContent.trim();
                if (t.length > 0) leafs.push(t);
            }
            if (leafs.length >= 2) {
                if (leafs[0].length <= 4 && /[^\x00-\x7F]/.test(leafs[0])) {
                    emoji = leafs[0];
                    title = leafs[1];
                } else {
                    title = leafs[0];
                }
            }
            title = title
                .replace(/🫣\s*Guilty/g, '')
                .replace(/✨\s*Good/g, '')
                .replace(/💰\s*Budget/g, '')
                .replace(/💪\s*Good/g, '')
                .replace(/😈\s*Guilty/g, '')
                .replace(/\b(daily|weekly|monthly)\b/gi, '')
                .trim();
            if (!title || title.length > 100) return;

            // AI comment
            let aiComment = null;
            const cm = text.match(
                /(🔥[^🔥]{30,300}|✨[^✨]{30,300}|💪[^💪]{30,300})/,
            );
            if (cm)
                aiComment = cm[1].replace(/\s*Edit\s*Archive\s*$/, '').trim();

            // Mark the card with a data attribute so execute() can find it
            card.setAttribute('data-webmcp-index', String(counters.length));

            counters.push({
                index: counters.length,
                cardIndex: index,
                title,
                emoji,
                type,
                sentiment,
                frequency,
                current,
                quota,
                aiComment,
            });
        });

        // Store diagnostic info
        const diagCards = document.querySelectorAll("div[class*='bg-card']");
        const diag = {
            bgCardCount: diagCards.length,
            parsedCount: counters.length,
            firstCardTextLen:
                diagCards.length > 0
                    ? (diagCards[0].textContent || '').length
                    : 0,
            firstCardHasEdit:
                diagCards.length > 0
                    ? (diagCards[0].textContent || '').includes('Edit')
                    : false,
            firstCardPreview:
                diagCards.length > 0
                    ? (diagCards[0].textContent || '').substring(0, 60)
                    : '',
        };

        // Store as DOM attribute — readable from isolated world
        document.body.setAttribute(
            'data-webmcp-counters',
            JSON.stringify(counters),
        );
        document.body.setAttribute('data-webmcp-username', getUsername() || '');
        document.body.setAttribute(
            'data-webmcp-updated',
            new Date().toISOString(),
        );
        document.body.setAttribute('data-webmcp-diag', JSON.stringify(diag));

        return counters;
    }

    // Listen for reparse requests from the isolated world
    document.body.addEventListener('webmcp-reparse', () => {
        console.log('[WebMCP] Reparse requested via event');
        parseAndStoreCounters();
    });

    // Initial parse with retries (SPA may not have rendered cards yet)
    function initParse() {
        const result = parseAndStoreCounters();
        console.log(`[WebMCP] Parse attempt: ${result.length} counters found`);
        if (result.length === 0) {
            // Log diagnostic info
            const cards = document.querySelectorAll("div[class*='bg-card']");
            console.log(`[WebMCP] bg-card divs: ${cards.length}`);
            if (cards.length > 0) {
                const first = cards[0];
                console.log(
                    `[WebMCP] First card textContent length: ${(first.textContent || '').length}`,
                );
                console.log(
                    `[WebMCP] First card preview: ${(first.textContent || '').substring(0, 80)}`,
                );
                console.log(
                    `[WebMCP] First card has Edit: ${(first.textContent || '').includes('Edit')}`,
                );
            }
        }
        return result;
    }

    // Try immediately, then retry at 1s, 3s, 5s, 8s
    let parseResult = initParse();
    if (parseResult.length === 0) {
        [1000, 3000, 5000, 8000].forEach((delay) => {
            setTimeout(() => {
                if (
                    JSON.parse(
                        document.body.getAttribute('data-webmcp-counters') ||
                            '[]',
                    ).length === 0
                ) {
                    console.log(`[WebMCP] Retry parse at +${delay}ms...`);
                    initParse();
                }
            }, delay);
        });
    }

    // Re-parse on DOM changes (counter increments, page updates)
    const observer = new MutationObserver(() => {
        clearTimeout(observer._debounce);
        observer._debounce = setTimeout(() => {
            const prev = JSON.parse(
                document.body.getAttribute('data-webmcp-counters') || '[]',
            ).length;
            const result = parseAndStoreCounters();
            if (result.length !== prev) {
                console.log(
                    `[WebMCP] MutationObserver: ${prev} → ${result.length} counters`,
                );
            }
        }, 500);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    // ─── ISOLATED WORLD HELPERS (used inside execute functions) ─────
    // These functions use `document` (the isolated world's document reference)
    // and read data from DOM attributes instead of parsing textContent.

    const readCounters = `
        function _readCounters() {
            const raw = document.body.getAttribute("data-webmcp-counters");
            if (!raw) return [];
            try { return JSON.parse(raw); } catch { return []; }
        }
    `;

    const readUsername = `
        function _readUsername() {
            return document.body.getAttribute("data-webmcp-username") || null;
        }
    `;

    // ─── TOOL: debug_webmcp ─────────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'debug_webmcp',
        description:
            'Diagnostic tool — returns DOM bridge status. Also tries to trigger a re-parse. Call this if list_counters returns 0.',
        inputSchema: { type: 'object', properties: {} },
        async execute() {
            // Try to trigger a re-parse by dispatching a custom event
            // (the main world listens for this)
            document.body.dispatchEvent(new CustomEvent('webmcp-reparse'));

            // Wait for parse to complete
            await new Promise((r) => setTimeout(r, 1000));

            const raw = document.body.getAttribute('data-webmcp-counters');
            const updated = document.body.getAttribute('data-webmcp-updated');
            const username = document.body.getAttribute('data-webmcp-username');
            const diag = document.body.getAttribute('data-webmcp-diag');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}
            return {
                result: {
                    bridge_active: !!raw,
                    updated,
                    username,
                    counter_count: counters.length,
                    counters_preview: counters.map((c) => ({
                        title: c.title,
                        type: c.type,
                        current: c.current,
                        quota: c.quota,
                    })),
                    diagnostics: diag,
                },
            };
        },
    });

    // ─── TOOL: list_counters ────────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'list_counters',
        description:
            'List all habit counters and budget trackers for the current user. ' +
            'Returns name, emoji, type (count/budget), sentiment (guilty/good), ' +
            'frequency, current count, quota, and AI roast comment. ' +
            'Call this first to see what the user tracks.',
        inputSchema: { type: 'object', properties: {} },
        async execute() {
            const raw = document.body.getAttribute('data-webmcp-counters');
            const username = document.body.getAttribute('data-webmcp-username');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}
            return {
                result: {
                    username,
                    total_counters: counters.length,
                    counters,
                },
            };
        },
    });

    // ─── TOOL: get_user_summary ─────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'get_user_summary',
        description:
            'High-level summary: total counters, over/under quota, budget status.',
        inputSchema: { type: 'object', properties: {} },
        async execute() {
            const raw = document.body.getAttribute('data-webmcp-counters');
            const username = document.body.getAttribute('data-webmcp-username');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}

            const countTrackers = counters.filter((c) => c.type === 'count');
            const budgetTrackers = counters.filter((c) => c.type === 'budget');
            const overQuota = countTrackers.filter(
                (c) => c.current > c.quota && c.quota > 0,
            );
            const needsAttention = countTrackers.filter(
                (c) => c.current < c.quota && c.sentiment === 'good',
            );
            const totalUsed = budgetTrackers.reduce((s, c) => s + c.current, 0);
            const totalLimit = budgetTrackers.reduce((s, c) => s + c.quota, 0);

            return {
                result: {
                    username,
                    total_trackers: counters.length,
                    count_trackers: countTrackers.length,
                    budget_trackers: budgetTrackers.length,
                    over_quota: overQuota.map((c) => ({
                        name: c.title,
                        current: c.current,
                        quota: c.quota,
                    })),
                    needs_attention: needsAttention.map((c) => ({
                        name: c.title,
                        current: c.current,
                        quota: c.quota,
                    })),
                    budget_summary: {
                        used: totalUsed,
                        limit: totalLimit,
                        remaining: totalLimit - totalUsed,
                        pct_used:
                            totalLimit > 0
                                ? Math.round((totalUsed / totalLimit) * 100)
                                : 0,
                    },
                },
            };
        },
    });

    // ─── TOOL: increment_counter ────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'increment_counter',
        description:
            'Increment a count-type tracker by 1. Call list_counters first. ' +
            "Only works for 'count' type (not budget). May generate AI roast.",
        inputSchema: {
            type: 'object',
            properties: {
                counter_name: {
                    type: 'string',
                    description: "Exact name of the counter (e.g., 'Coffee')",
                },
            },
            required: ['counter_name'],
        },
        async execute({ counter_name }) {
            const raw = document.body.getAttribute('data-webmcp-counters');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}

            const counter = counters.find(
                (c) => c.title.toLowerCase() === counter_name.toLowerCase(),
            );
            if (!counter) {
                return {
                    result: {
                        success: false,
                        error: `"${counter_name}" not found. Available: ${counters.map((c) => c.title).join(', ')}`,
                    },
                };
            }
            if (counter.type !== 'count') {
                return {
                    result: {
                        success: false,
                        error: `"${counter_name}" is budget type. Use add_budget_amount.`,
                    },
                };
            }

            // Find the card by data attribute, then find its increment button
            const card = document.querySelector(
                `div[data-webmcp-index="${counter.index}"]`,
            );
            if (!card) {
                return {
                    result: {
                        success: false,
                        error: 'Card element not found in DOM.',
                    },
                };
            }

            const btn = card.querySelector(
                "button[aria-label='Increment count']",
            );
            if (!btn) {
                // Fallback: find by SVG plus icon
                const buttons = card.querySelectorAll('button');
                let found = false;
                for (const b of buttons) {
                    if (
                        b.querySelector('svg') &&
                        !b.textContent.includes('Edit') &&
                        !b.textContent.includes('Archive')
                    ) {
                        b.click();
                        found = true;
                        break;
                    }
                }
                if (!found)
                    return {
                        result: {
                            success: false,
                            error: 'Increment button not found.',
                        },
                    };
            } else {
                btn.click();
            }

            // Wait for update and re-read
            await new Promise((r) => setTimeout(r, 2000));
            const updated = document.body.getAttribute('data-webmcp-counters');
            let newCounters = [];
            try {
                newCounters = JSON.parse(updated || '[]');
            } catch {}
            const newCounter = newCounters.find(
                (c) => c.title.toLowerCase() === counter_name.toLowerCase(),
            );

            return {
                result: {
                    success: true,
                    counter_name: counter.title,
                    previous: counter.current,
                    new_count: newCounter?.current ?? counter.current + 1,
                    quota: counter.quota,
                    ai_comment: newCounter?.aiComment,
                },
            };
        },
    });

    // ─── TOOL: add_budget_amount ────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'add_budget_amount',
        description:
            "Add an amount to a budget tracker. Only for 'budget' type.",
        inputSchema: {
            type: 'object',
            properties: {
                counter_name: {
                    type: 'string',
                    description: 'Budget tracker name',
                },
                amount: {
                    type: 'number',
                    description:
                        'Amount to add (positive) or subtract (negative)',
                },
            },
            required: ['counter_name', 'amount'],
        },
        async execute({ counter_name, amount }) {
            const raw = document.body.getAttribute('data-webmcp-counters');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}

            const counter = counters.find(
                (c) => c.title.toLowerCase() === counter_name.toLowerCase(),
            );
            if (!counter)
                return {
                    result: {
                        success: false,
                        error: `"${counter_name}" not found.`,
                    },
                };
            if (counter.type !== 'budget')
                return {
                    result: { success: false, error: 'Not a budget tracker.' },
                };

            const card = document.querySelector(
                `div[data-webmcp-index="${counter.index}"]`,
            );
            if (!card)
                return { result: { success: false, error: 'Card not found.' } };

            // Click +/- button
            const buttons = card.querySelectorAll('button');
            for (const b of buttons) {
                if (
                    b.textContent.trim() === '+/−' ||
                    b.getAttribute('aria-label')?.includes('+')
                ) {
                    b.click();
                    break;
                }
            }
            await new Promise((r) => setTimeout(r, 800));

            // Find number input and fill it
            const input = document.querySelector("input[type='number']");
            if (input) {
                const setter = Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype,
                    'value',
                ).set;
                setter.call(input, Math.abs(amount).toString());
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise((r) => setTimeout(r, 500));

                // Submit
                const submitBtns = document.querySelectorAll('button');
                for (const b of submitBtns) {
                    const t = b.textContent.toLowerCase();
                    if (
                        t.includes('add') ||
                        t.includes('submit') ||
                        t.includes('confirm') ||
                        t.includes('save')
                    ) {
                        b.click();
                        break;
                    }
                }
            }
            await new Promise((r) => setTimeout(r, 2000));

            const updated = document.body.getAttribute('data-webmcp-counters');
            let newCounters = [];
            try {
                newCounters = JSON.parse(updated || '[]');
            } catch {}
            const nc = newCounters.find(
                (c) => c.title.toLowerCase() === counter_name.toLowerCase(),
            );

            return {
                result: {
                    success: true,
                    counter_name: counter.title,
                    previous: counter.current,
                    new_amount: nc?.current,
                    budget_limit: counter.quota,
                },
            };
        },
    });

    // ─── TOOL: get_weekly_wrapup ────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'get_weekly_wrapup',
        description: 'Read the AI weekly wrap-up summary if available.',
        inputSchema: { type: 'object', properties: {} },
        async execute() {
            // The wrap-up text is in the body preview — extract from body text
            const bodyText =
                document.body.innerText || document.body.textContent || '';
            const wrapMatch = bodyText.match(
                /Wrap-up\s*([\s\S]{20,500}?)(?:Read more|$)/,
            );
            if (!wrapMatch) return { result: { available: false } };

            // Click Read more if exists
            const buttons = document.querySelectorAll('button');
            for (const b of buttons) {
                if (b.textContent.includes('Read more')) {
                    b.click();
                    break;
                }
            }
            await new Promise((r) => setTimeout(r, 500));

            const updatedText =
                document.body.innerText || document.body.textContent || '';
            const fullMatch = updatedText.match(
                /Wrap-up\s*([\s\S]{20,1000}?)(?:Read more|Dismiss|👱)/,
            );

            return {
                result: {
                    available: true,
                    username: document.body.getAttribute(
                        'data-webmcp-username',
                    ),
                    text: (fullMatch?.[1] || wrapMatch[1]).trim(),
                },
            };
        },
    });

    // ─── TOOL: create_tracker ───────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'create_tracker',
        description:
            'Create a new tracker. Opens form, fills it, submits. ' +
            "Type: 'count' or 'budget'. Sentiment: 'guilty' or 'good'. " +
            "Period: 'Daily', 'Weekly', or 'Monthly'.",
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Tracker name' },
                type: { type: 'string', enum: ['count', 'budget'] },
                sentiment: { type: 'string', enum: ['guilty', 'good'] },
                quota: { type: 'number', description: 'Target number' },
                period: {
                    type: 'string',
                    enum: ['Daily', 'Weekly', 'Monthly'],
                },
                description: {
                    type: 'string',
                    description: 'Optional description',
                },
            },
            required: ['title', 'type', 'sentiment', 'quota', 'period'],
        },
        async execute({ title, type, sentiment, quota, period, description }) {
            // Click Add button
            const addBtn = [...document.querySelectorAll('button')].find((b) =>
                b.textContent.includes('Add'),
            );
            if (!addBtn)
                return {
                    result: { success: false, error: 'Add button not found.' },
                };
            addBtn.click();
            await new Promise((r) => setTimeout(r, 600));

            // Select type
            const typeBtn = [...document.querySelectorAll('button')].find(
                (b) => {
                    const t = b.textContent.toLowerCase();
                    return type === 'budget'
                        ? t.includes('budget')
                        : t.includes('count');
                },
            );
            if (typeBtn) typeBtn.click();
            await new Promise((r) => setTimeout(r, 300));

            // Fill title
            const titleInput = document.querySelector(
                "input[placeholder*='Title'], input[aria-label*='Title']",
            );
            if (titleInput) {
                const setter = Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype,
                    'value',
                ).set;
                setter.call(titleInput, title);
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                titleInput.dispatchEvent(
                    new Event('change', { bubbles: true }),
                );
            }
            await new Promise((r) => setTimeout(r, 300));

            // Select sentiment
            const sentBtn = [...document.querySelectorAll('button')].find(
                (b) => {
                    const t = b.textContent.toLowerCase();
                    return sentiment === 'good'
                        ? t.includes('good')
                        : t.includes('guilty');
                },
            );
            if (sentBtn) sentBtn.click();
            await new Promise((r) => setTimeout(r, 300));

            // Set quota
            const quotaInput = document.querySelector("input[type='number']");
            if (quotaInput) {
                const setter = Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype,
                    'value',
                ).set;
                setter.call(quotaInput, quota.toString());
                quotaInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            await new Promise((r) => setTimeout(r, 300));

            // Select period
            const periodSelect = document.querySelector(
                "select, [role='combobox']",
            );
            if (periodSelect?.tagName === 'SELECT') {
                periodSelect.value = period;
                periodSelect.dispatchEvent(
                    new Event('change', { bubbles: true }),
                );
            } else if (periodSelect) {
                periodSelect.click();
                await new Promise((r) => setTimeout(r, 400));
                const option = [
                    ...document.querySelectorAll("[role='option']"),
                ].find((o) => o.textContent.trim() === period);
                if (option) option.click();
            }
            await new Promise((r) => setTimeout(r, 300));

            // Fill description
            if (description) {
                const descInput = document.querySelector(
                    "input[placeholder*='Description'], input[aria-label*='Description']",
                );
                if (descInput) {
                    const setter = Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype,
                        'value',
                    ).set;
                    setter.call(descInput, description);
                    descInput.dispatchEvent(
                        new Event('input', { bubbles: true }),
                    );
                }
            }
            await new Promise((r) => setTimeout(r, 300));

            // Submit
            const createBtn = [...document.querySelectorAll('button')].find(
                (b) => b.textContent.includes('Create Tracker'),
            );
            if (createBtn) {
                createBtn.click();
                await new Promise((r) => setTimeout(r, 2000));
            }

            return {
                result: {
                    success: true,
                    message: `Tracker "${title}" creation submitted.`,
                },
            };
        },
    });

    // ─── TOOL: archive_tracker ──────────────────────────────────────

    navigator.modelContext.registerTool({
        name: 'archive_tracker',
        description: 'Archive a tracker. May require confirmation.',
        inputSchema: {
            type: 'object',
            properties: {
                counter_name: {
                    type: 'string',
                    description: 'Tracker name to archive',
                },
            },
            required: ['counter_name'],
        },
        async execute({ counter_name }) {
            const raw = document.body.getAttribute('data-webmcp-counters');
            let counters = [];
            try {
                counters = JSON.parse(raw || '[]');
            } catch {}
            const counter = counters.find(
                (c) => c.title.toLowerCase() === counter_name.toLowerCase(),
            );
            if (!counter)
                return {
                    result: {
                        success: false,
                        error: `"${counter_name}" not found.`,
                    },
                };

            const card = document.querySelector(
                `div[data-webmcp-index="${counter.index}"]`,
            );
            if (!card)
                return { result: { success: false, error: 'Card not found.' } };

            const archiveBtn = [...card.querySelectorAll('button')].find(
                (b) => b.textContent.trim() === 'Archive',
            );
            if (!archiveBtn)
                return {
                    result: {
                        success: false,
                        error: 'Archive button not found.',
                    },
                };
            archiveBtn.click();
            await new Promise((r) => setTimeout(r, 1000));

            // Handle confirmation
            const confirmBtn = [...document.querySelectorAll('button')].find(
                (b) =>
                    b.textContent.includes('Confirm') ||
                    b.textContent.includes('Yes') ||
                    (b.textContent.includes('Archive') && b !== archiveBtn),
            );
            if (confirmBtn) {
                confirmBtn.click();
                await new Promise((r) => setTimeout(r, 1000));
            }

            return {
                result: {
                    success: true,
                    message: `"${counter_name}" archive requested.`,
                },
            };
        },
    });

    console.log(
        `[Silly Count WebMCP v2.1] 8 tools registered for "${getUsername()}" (DOM attribute bridge)\n` +
            '  Tools: debug_webmcp, list_counters, get_user_summary, increment_counter,\n' +
            '         add_budget_amount, get_weekly_wrapup, create_tracker, archive_tracker',
    );
})();
