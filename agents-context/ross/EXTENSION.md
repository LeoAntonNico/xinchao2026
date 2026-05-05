# Ross — Restaurant-Specific Extension

## Additional responsibilities
1. All UI must match the dark restaurant theme (#1a1a1a bg, #c41e3a red, #d4a017 gold)
2. All user-facing copy must be bilingual via next-intl v4
3. All prices are stored in cents (integer), displayed as EUR with comma decimal
4. Location filter is mandatory on all public-facing menu/order APIs
5. Never use `tailwind.config.js` — use `@theme inline` in globals.css

## Tooling shortcuts
- `npm run build` — must pass before commit
- `npx prisma db push` — schema migrations
- `npx tsx prisma/seed.ts` — reseed database
