# MEMORY — Long-Term Project Memory

## Project
Xin Chào Restaurant — Vietnamese street food, 2 locations (Utrecht + Wageningen), bilingual EN/NL, online ordering + reservations.

## Tech Stack
- Next.js 16.2.4 (Turbopack) + TypeScript
- Tailwind CSS v4 (@theme inline)
- next-intl v4 (EN + NL)
- Prisma 7 + PostgreSQL 15 (local Homebrew)
- Mollie API (iDEAL payments)
- NextAuth credentials provider (admin only)

## Admin Access
URL: http://localhost:3000/admin/login
Username: admin
Password: admin
Session: 8 hours (JWT)

## Completed Features
- [x] Public menu with location filter
- [x] Online ordering flow (menu → cart → checkout → Mollie)
- [x] Reservation system with capacity-based slots
- [x] Admin dashboard framework
- [x] Admin products CRUD with multi-location support
- [x] Admin categories inline creation
- [x] Auto-redirect on auth expiry

## In Progress
- [ ] Admin orders dashboard (status workflow)
- [ ] Admin reservations view
- [ ] Mollie webhook integration
- [ ] Email notifications (Pam)
- [ ] Public reservation complete flow
- [ ] Social media prep (Kelly)

## Key Decisions
- Many-to-many MenuItem ↔ Location (not single locationId)
- Pickup slots are 15-minute windows, capacity-limited
- Dark theme: #1a1a1a bg, #252525 sidebar, #c41e3a red, #d4a017 gold
- No middleware — auth checked per API route via getServerSession
- All admin fetches use credentials: "include"

## Known Issues
- NEXTAUTH_URL truncated in .env (needs verification before deploy)
- No image upload — only URL-based images currently
- No email service set up yet
- No analytics (Plausible or GA) installed
