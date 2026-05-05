# Xin Chào Agent Team

This directory contains the multi-agent operating system for the Xin Chào restaurant project.

## How to Use

To invoke an agent, tell Monica (the chief of staff) what you need. She will delegate to the right specialist:

- **"Dwight, research..."** → Competitor intel, SEO, trends
- **"Ross, build..."** → Code, features, fixes
- **"Pam, write..."** → Email copy, newsletters, transactional text
- **"Kelly, create..."** → Social media content, captions, hashtags
- **"Rachel, analyze..."** → Pricing, capacity, margins, analytics

## Directory Structure

```
agents/
├── monica/              # Chief of Staff — orchestration, roadmap, priorities
│   ├── SOUL.md
│   └── HEARTBEAT.md     # Daily operation log
├── dwight/              # Research & Intel — competitors, SEO, trends
│   ├── SOUL.md
│   └── DAILY-INTEL.md   # Intelligence briefs
├── ross/                # Engineering — code, build, deploy
│   └── SOUL.md
├── pam/                 # Newsletter & Email — retention, promotions
│   └── SOUL.md
├── kelly/               # Social Media — content, viral, engagement
│   ├── SOUL.md
│   └── DRAFTS.md        # Content bank
├── rachel/              # Operations — pricing, capacity, analytics
│   └── SOUL.md
├── shared-context/      # Shared knowledge base
│   ├── THESIS.md        # Vision & principles
│   ├── SIGNALS.md       # Reference intel
│   └── FEEDBACK-LOG.md  # Style corrections & decisions
├── memory/              # Daily continuity logs
│   └── YYYY-MM-DD.md
└── MEMORY.md            # Long-term project memory
```

## Rules
1. Only Monica edits MEMORY.md and THESIS.md
2. Each agent owns their directory; others append only with permission
3. shared-context/ is read-only for specialists; Monica edits
4. memory/ is append-only; never delete old logs
