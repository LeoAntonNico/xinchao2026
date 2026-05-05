# Xin Chào Agent Context

This is the **project-specific overlay** for the Xin Chào restaurant. The universal agent team lives at `~/.hermes/agents/`.

## How it works

When you invoke an agent on this project, they read:
1. Their universal SOUL.md from `~/.hermes/agents/{agent}/SOUL.md`
2. This project's THESIS.md, SIGNALS.md, and MEMORY.md
3. Any HEARTBEAT / DAILY-* files for operational context

## Files

| File | Purpose |
|------|---------|
| `THESIS.md` | What Xin Chào believes — vision, principles, brand voice |
| `SIGNALS.md` | Competitors, SEO keywords, customer segments, market data |
| `FEEDBACK-LOG.md` | Human corrections — all agents read before working |
| `MEMORY.md` | Long-term project memory — features, decisions, issues |
| `memory/YYYY-MM-DD.md` | Daily continuity logs |

## Invoking agents on this project

Just say their name + the restaurant context:

- **"Ross, build the admin orders dashboard"** → Ross reads THESIS.md (Next.js 16, Tailwind v4, dark theme) and builds it
- **"Dwight, research xinchao.nl checkout flow"** → Dwight reads SIGNALS.md (competitor list) and reports
- **"Pam, write an order confirmation email"** → Pam reads THESIS.md (bilingual NL/EN, warm tone) and writes
- **"Kelly, draft launch posts for Utrecht"** → Kelly reads SIGNALS.md (customer segments, hashtags) and creates
- **"Rachel, model our pickup slot capacity"** → Rachel reads THESIS.md (capacity-based, 15-min windows) and analyzes

## Project status

See `MEMORY.md` for current sprint and blockers.
