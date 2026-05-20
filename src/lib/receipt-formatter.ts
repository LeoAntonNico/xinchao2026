/**
 * Receipt formatter for Epson TM-T20III ESC/POS printing
 * Matches the invoice template from the user's reference image
 *
 * Paper: 80mm thermal
 * Columns: 56 (Font B / condensed mode) — use 48 for safety margin
 * Codepage: 858 (Euro symbol support)
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number; // cents
  modifiers?: { label: string; value: string }[];
}

export interface ReceiptData {
  locationName: string;
  address: string;
  postalCode: string;
  city: string;
  customerName: string;
  customerAddress?: string;
  customerPostalCode?: string;
  customerCity?: string;
  customerPhone: string;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  shippingMethod: string;
  orderTime: string;
  pickupTime: string;
  items: ReceiptItem[];
  subtotal: number; // cents
  shipping: number; // cents
  total: number; // cents
}

// --- ESC/POS constants ---
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const HT = 0x09;

function bytes(...vals: number[]): Buffer {
  return Buffer.from(vals);
}

function txt(str: string): Buffer {
  // Map common chars for codepage 858 compatibility
  const map: Record<string, string> = {
    '€': '\xD5',
    'ë': '\x89',
    'ï': '\x8B',
    'ö': '\x94',
    'ü': '\x81',
    'á': '\xA0',
    'é': '\x82',
    'í': '\xA1',
    'ó': '\xA2',
    'ú': '\xA3',
    'ñ': '\xA4',
    'ç': '\x87',
  };
  let out = str;
  for (const [k, v] of Object.entries(map)) {
    out = out.split(k).join(v);
  }
  return Buffer.from(out, 'latin1');
}

/* ── printer commands ── */
const reset = () => bytes(ESC, 0x40);
const cut = () => bytes(GS, 0x56, 0x01);
const feed = (n = 1) => Buffer.concat(Array(n).fill(bytes(LF)));
const bold = (on: boolean) => bytes(ESC, 0x45, on ? 1 : 0);
const underline = (on: boolean) => bytes(ESC, 0x2D, on ? 1 : 0);
const align = (pos: 'L' | 'C' | 'R') => bytes(ESC, 0x61, pos === 'L' ? 0 : pos === 'C' ? 1 : 2);
const font = (type: 'A' | 'B') => bytes(ESC, 0x4D, type === 'B' ? 1 : 0);
const dw = (on: boolean) => bytes(ESC, 0x21, on ? 0x30 : 0x00); // double-width + height
const dhOnly = (on: boolean) => bytes(ESC, 0x21, on ? 0x20 : 0x00); // double-width only
const inverse = (on: boolean) => bytes(GS, 0x42, on ? 1 : 0);

/* tab-stops (columns in Font-B are ~7 dots)
 *  stop1 = col 30  → product name area
 *  stop2 = col 37  → quantity
 *  stop3 = col 48  → price (right aligned)
 */
const setTabs = () => bytes(ESC, 0x44, 30, 37, 48, 0);

/* ── helpers ── */
const fmtCents = (c: number) => `EUR ${(c / 100).toFixed(2).replace('.', ',')}`;
const padR = (s: string, w: number) => s.length > w ? s.slice(0, w - 1) + '…' : s.padEnd(w);
const padL = (s: string, w: number) => s.padStart(w);
const sepLine = (ch: string) => txt(ch.repeat(48));

/* ── wrap text at width, returning lines ── */
function wrapLines(str: string, width: number): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= width) {
      cur = cur ? cur + ' ' + w : w;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/* ═════════════════════════════════════════════
   ESC/POS receipt buffer (thermal printer)
   ═════════════════════════════════════════════ */
export function formatReceiptEscPos(data: ReceiptData): Buffer {
  const parts: Buffer[] = [];
  const push = (...b: Buffer[]) => parts.push(...b);

  // Init
  push(reset(), font('B'), bytes(GS, 0x4C, 0x00, 0x00)); // left margin = 0

  // Header
  push(align('C'));
  push(bold(true));
  push(txt(data.locationName), feed());
  push(bold(false));
  push(txt(data.address), feed());
  push(txt(`${data.postalCode} ${data.city}`), feed(2));

  // INVOICE banner (inverse)
  push(inverse(true), bold(true));
  push(align('C'));
  push(txt('  INVOICE  '));
  push(inverse(false), bold(false));
  push(feed(2));

  // ══ BILLING ══
  push(align('L'), bold(true));
  push(txt('Billing Address:'), feed());
  push(bold(false));
  push(txt(data.customerName), feed());
  if (data.customerAddress) push(txt(data.customerAddress), feed());
  if (data.customerPostalCode && data.customerCity) {
    push(txt(`${data.customerPostalCode} ${data.customerCity}`), feed());
  }
  push(txt(data.customerPhone), feed(2));

  // ══ ORDER DETAILS ══
  const kv = (k: string, v: string) => push(txt(`${padR(k + ':', 16)} ${v}`), feed());
  kv('Order Number', data.orderNumber);
  kv('Order Date', data.orderDate);
  kv('Payment', data.paymentMethod);
  kv('Shipping', data.shippingMethod);
  kv('Order Time', data.orderTime);
  kv('Pickup Time', data.pickupTime);
  push(feed());

  // ══ TABLE HEADER (inverse bar) ══
  push(inverse(true));
  push(txt('Product                    Qty   Price'));
  push(inverse(false), feed());

  // ══ ITEMS ══
  setTabs();
  for (const item of data.items) {
    // Product line (bold name) — wrap if too long
    const nameLines = wrapLines(item.name, 28);
    push(bold(true), txt(padR(nameLines[0], 28)));
    push(bytes(HT), txt(padL(String(item.quantity), 4)));
    push(bytes(HT), txt(padL(fmtCents(item.price), 12)));
    push(bold(false), feed());

    // wrapped name continuations (no bold, no price)
    for (let i = 1; i < nameLines.length; i++) {
      push(txt(`  ${nameLines[i]}`), feed());
    }

    // Modifiers indented
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        const line = `  ${mod.label}: ${mod.value}`;
        const modLines = wrapLines(line, 44);
        for (const ml of modLines) {
          push(txt(ml), feed());
        }
      }
    }
  }

  // ══ TOTALS ══
  push(sepLine('-'), feed());
  push(txt(`${padR('Subtotaal:', 36)}${padL(fmtCents(data.subtotal), 12)}`), feed());
  push(txt(`${padR('Verzending:', 36)}${padL(data.shippingMethod, 12)}`), feed());
  push(sepLine('='), feed());

  push(bold(true), dw(true));
  push(txt(`${padR('TOTAAL:', 20)}${padL(fmtCents(data.total), 22)}`));
  push(dw(false), bold(false), feed());
  push(sepLine('='), feed(4));

  push(cut());
  return Buffer.concat(parts);
}

/* ═════════════════════════════════════════════
   Plain-text preview (for admin UI / logs)
   ═════════════════════════════════════════════ */
export function formatReceiptText(data: ReceiptData): string {
  const w = 48;
  const c = (s: string) => s.padStart((w + s.length) / 2).padEnd(w);
  const line = (ch: string) => ch.repeat(w);
  const f = fmtCents;
  const pr = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
  const pl = (s: string, n: number) => s.padStart(n);

  let out = '';
  out += c(data.locationName) + '\n';
  out += c(data.address) + '\n';
  out += c(`${data.postalCode} ${data.city}`) + '\n\n';
  out += c('INVOICE') + '\n\n';

  out += 'Billing Address:\n';
  out += `${data.customerName}\n`;
  if (data.customerAddress) out += `${data.customerAddress}\n`;
  if (data.customerPostalCode && data.customerCity)
    out += `${data.customerPostalCode} ${data.customerCity}\n`;
  out += `${data.customerPhone}\n\n`;

  out += `Order Number:  ${data.orderNumber}\n`;
  out += `Order Date:    ${data.orderDate}\n`;
  out += `Payment:       ${data.paymentMethod}\n`;
  out += `Shipping:      ${data.shippingMethod}\n`;
  out += `Order Time:    ${data.orderTime}\n`;
  out += `Pickup Time:   ${data.pickupTime}\n\n`;

  out += pr('Product', 28) + pl('Qty', 5) + pl('Price', 14) + '\n';
  out += line('-') + '\n';

  for (const item of data.items) {
    const lines = wrapLines(item.name, 28);
    out += pr(lines[0], 28) + pl(String(item.quantity), 5) + pl(f(item.price), 14) + '\n';
    for (let i = 1; i < lines.length; i++) {
      out += `  ${lines[i]}\n`;
    }
    if (item.modifiers) {
      for (const mod of item.modifiers) {
        const ml = wrapLines(`  ${mod.label}: ${mod.value}`, 44);
        for (const l of ml) out += l + '\n';
      }
    }
  }

  out += line('-') + '\n';
  out += pr('Subtotaal:', 36) + pl(f(data.subtotal), 12) + '\n';
  out += pr('Verzending:', 36) + pl(data.shippingMethod, 12) + '\n';
  out += line('=') + '\n';
  out += `** TOTAAL:                      ${pl(f(data.total), 12)}\n`;
  out += line('=') + '\n';
  return out;
}

/* ═════════════════════════════════════════════
   Build ReceiptData from an Order
   ═════════════════════════════════════════════ */
export function buildReceiptFromOrder(
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    totalAmount: number;
    notes?: string | null;
    createdAt: Date;
    items: {
      quantity: number;
      price: number;
      variantName?: string | null;
      modifierNames: string[];
      menuItem: { name: string; nameNl?: string | null };
    }[];
  },
  location: {
    name: string;
    address: string;
    phone: string;
  },
  pickupTime?: string
): ReceiptData {
  const orderDate = order.createdAt.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const street = location.address.split(',')[0]?.trim() || location.address;

  const items: ReceiptItem[] = order.items.map((it) => {
    const name = it.menuItem.nameNl || it.menuItem.name;
    const mods: { label: string; value: string }[] = [];
    if (it.variantName) mods.push({ label: 'Keuze', value: it.variantName });
    if (it.modifierNames.length > 0) {
      // Try to split "Label: Value" pairs
      const joined = it.modifierNames.join(', ');
      mods.push({ label: 'Extras', value: joined });
    }
    return { name, quantity: it.quantity, price: it.price, modifiers: mods.length ? mods : undefined };
  });

  return {
    locationName: location.name,
    address: street,
    postalCode: '6701 BT',
    city: location.name,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderNumber: order.id.slice(-5).toUpperCase(),
    orderDate,
    paymentMethod: 'iDEAL | Wero',
    shippingMethod: 'Lokaal afhalen',
    orderTime: order.createdAt.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    pickupTime: pickupTime || 'ASAP',
    items,
    subtotal: order.totalAmount,
    shipping: 0,
    total: order.totalAmount,
  };
}

/* ═════════════════════════════════════════════
   Test receipt data (for admin print-test page)
   ═════════════════════════════════════════════ */
export function getTestReceiptData(locationName = 'Wageningen'): ReceiptData {
  return {
    locationName: `Xin Chao ${locationName}`,
    address: 'Hoogstraat 18',
    postalCode: '6701 BT',
    city: locationName,
    customerName: 'Peter Van Hooff',
    customerAddress: 'Rustenburg 18',
    customerPostalCode: '6701 DV',
    customerCity: locationName,
    customerPhone: '0652801056',
    orderNumber: '13927',
    orderDate: '7 mei 2026',
    paymentMethod: 'IDEAL | Wero',
    shippingMethod: 'Lokaal afhalen',
    orderTime: '16:05:14',
    pickupTime: '17:50',
    items: [
      {
        name: 'Viên Chiên',
        quantity: 1,
        price: 695,
        modifiers: [{ label: 'Keuze', value: 'Vegan' }],
      },
      {
        name: 'Gỏi Cuốn',
        quantity: 1,
        price: 695,
        modifiers: [{ label: 'Vulling', value: 'Garnalen en ei' }],
      },
      {
        name: 'Bún \'Xin Chao\'',
        quantity: 1,
        price: 1895,
        modifiers: [
          { label: 'Toppings (+EUR 0,50)', value: 'Gestoofde rundvlees' },
          { label: 'Saus', value: 'Soja saus' },
          { label: 'Extra\'s (+EUR 3,50)', value: 'Extra Topping' },
          { label: 'Glutenallergie', value: 'Nee' },
        ],
      },
      {
        name: 'Bún \'Xin Chao\'',
        quantity: 1,
        price: 1845,
        modifiers: [
          { label: 'Toppings', value: 'Gegrilde chili kip' },
          { label: 'Saus', value: 'Soja saus' },
          { label: 'Extra\'s (+EUR 3,50)', value: 'Extra Topping' },
          { label: 'Glutenallergie', value: 'Nee' },
        ],
      },
      {
        name: 'Gỏi Cuốn',
        quantity: 1,
        price: 695,
        modifiers: [{ label: 'Vulling', value: 'Là Vong gebakken vis' }],
      },
    ],
    subtotal: 5825,
    shipping: 0,
    total: 5825,
  };
}
