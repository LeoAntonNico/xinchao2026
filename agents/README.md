# Print System Setup — Xin Chao

## Overview
Replace PrintNode with a self-hosted print queue. Each branch runs a tiny Node.js agent on a mini PC / Raspberry Pi that polls your website for new print jobs and sends ESC/POS receipt data directly to the Epson TM-T20III over LAN.

---

## 1. Printer Network Setup

Set **STATIC IP** on each Epson TM-T20III (via printer's network config menu or router DHCP reservation):

| Branch | Suggested IP |
|---|---|
| Utrecht | `192.168.1.101` |
| Wageningen | `192.168.1.102` |

Epson default raw TCP port: **9100**

---

## 2. Deploy the Print Agent (per branch)

### On a mini PC / Raspberry Pi at the branch:

```bash
# 1. Copy the agent folder
cp -r /path/to/website/agents ~/xinchao-printer
cd ~/xinchao-printer

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env-printer.example .env
# Edit .env:
#   PRINT_API_URL=https://xinchao.nl
#   PRINT_AGENT_SECRET=your-random-secret-here
#   PRINTER_IP=192.168.1.101    # <-- branch specific
#   PRINTER_PORT=9100
#   LOCATION=utrecht             # <-- branch specific

# 4. Test run
node printer-agent.js
```

### Production: run with systemd or pm2

```bash
# Install pm2 globally
sudo npm install -g pm2

# Start agent
pm2 start printer-agent.js --name printer-utrecht
pm2 save
pm2 startup
```

---

## 3. Website Environment

Add to your website's `.env`:

```env
# Same secret as the branch agents
PRINT_AGENT_SECRET="xinchao-print-secret-2026"
```

---

## 4. How It Works (Order → Print)

```
Customer pays via iDEAL
       ↓
Mollie sends webhook → /api/webhook/mollie
       ↓
Order status = PAID
       ↓
Auto POST /api/print-queue  { orderId, location: "utrecht" }
       ↓
PrintJob created in DB (status: PENDING)
       ↓
Agent at Utrecht polls /api/print-queue?location=utrecht
       ↓
Agent gets job with escposData (base64)
       ↓
Agent sends raw TCP to 192.168.1.101:9100
       ↓
PATCH /api/print-queue/[id] → status: PRINTED
```

---

## 5. Receipt Format

The receipt matches your reference invoice exactly:
- Restaurant header with `xin chao` branding
- Customer billing address
- Order #, date, payment method, pickup time
- Product table with modifiers (toppings, sauces, extras)
- Subtotaal + Totaal (EUR, comma decimal)
- Thermal printer optimized (48-char width, bold headers)

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Agent "Unauthorized" | Check `PRINT_AGENT_SECRET` matches on both sides |
| Printer not connecting | Verify static IP, test: `telnet <IP> 9100` |
| Receipt garbled text | Printer codepage — reset to 858 (Euro) in agent |
| Jobs stuck PENDING | Check agent is running: `pm2 status` |
| Queue backing up | Reduce `POLL_INTERVAL` to 3000ms |

---

## Files Created

```
src/lib/receipt-formatter.ts       # ESC/POS buffer builder + receipt template
src/app/api/print-queue/route.ts   # GET (agent polls) + POST (enqueue)
src/app/api/print-queue/[id]/route.ts  # PATCH (mark printed/failed)
agents/printer-agent.js            # Branch-local polling agent
agents/package.json                # Agent deps
agents/.env-printer.example        # Agent config template
prisma/schema.prisma               # + PrintJob model
```
