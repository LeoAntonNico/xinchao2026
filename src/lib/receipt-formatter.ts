/**
 * Receipt formatter for Epson TM-T20III ESC/POS printing.
 * Paper: 80mm thermal, using Font B at 48 safe columns.
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

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const COLUMNS = 48;

function bytes(...vals: number[]): Buffer {
  return Buffer.from(vals);
}

function txt(str: string): Buffer {
  const map: Record<string, string> = {
    "€": "\xD5",
    "ë": "\x89",
    "ï": "\x8B",
    "ö": "\x94",
    "ü": "\x81",
    "á": "\xA0",
    "é": "\x82",
    "í": "\xA1",
    "ó": "\xA2",
    "ú": "\xA3",
    "ñ": "\xA4",
    "ç": "\x87",
  };

  let out = str;
  for (const [from, to] of Object.entries(map)) {
    out = out.split(from).join(to);
  }
  return Buffer.from(out, "latin1");
}

const reset = () => bytes(ESC, 0x40);
const cut = () => bytes(GS, 0x56, 0x41, 0x00);
const feed = (n = 1) => Buffer.concat(Array(n).fill(bytes(LF)));
const bold = (on: boolean) => bytes(ESC, 0x45, on ? 1 : 0);
const align = (pos: "L" | "C" | "R") => bytes(ESC, 0x61, pos === "L" ? 0 : pos === "C" ? 1 : 2);
const font = (type: "A" | "B") => bytes(ESC, 0x4D, type === "B" ? 1 : 0);
const inverse = (on: boolean) => bytes(GS, 0x42, on ? 1 : 0);
const leftMargin = () => bytes(GS, 0x4C, 0x00, 0x00);

const fmtCents = (cents: number) => `€ ${(cents / 100).toFixed(2).replace(".", ",")}`;
const padR = (value: string, width: number) => value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
const padL = (value: string, width: number) => value.length > width ? value.slice(0, width) : value.padStart(width);
const line = (char: string, width = COLUMNS) => char.repeat(width);
const row = (left: string, middle: string, right: string) => `${padR(left, 27)}${padL(middle, 10)}${padL(right, 11)}`;
const headerRow = (left: string, right: string) => `${padR(left, 22)}${padL(right, 26)}`;
const totalRow = (label: string, value: string) => `${padR(label, 11)}${padL(value, 14)}`;

function wrapLines(value: string, width: number): string[] {
  const words = value.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function writeTextLine(parts: Buffer[], value = "") {
  parts.push(txt(value), feed());
}

function writeKeyValue(parts: Buffer[], key: string, value: string) {
  parts.push(bold(true), txt(padR(`${key}:`, 17)), bold(false), txt(value), feed());
}

function writeReceiptHeader(parts: Buffer[], data: ReceiptData) {
  parts.push(align("L"));
  parts.push(bold(true), txt(headerRow("XIN CHAO", data.locationName)), bold(false), feed());
  writeTextLine(parts, headerRow("Vietnamese Street Food", data.address));
  writeTextLine(parts, headerRow("", `${data.postalCode} ${data.city}`));
  parts.push(feed());
}

function writeReceiptItems(parts: Buffer[], data: ReceiptData) {
  parts.push(inverse(true), bold(true), txt(row("Product", "Quantity", "Price")), bold(false), inverse(false), feed());

  for (const item of data.items) {
    const nameLines = wrapLines(item.name, 27);
    writeTextLine(parts, row(nameLines[0], String(item.quantity), fmtCents(item.price)));
    for (let i = 1; i < nameLines.length; i += 1) {
      writeTextLine(parts, `  ${nameLines[i]}`);
    }

    for (const modifier of item.modifiers || []) {
      const modifierLines = wrapLines(`${modifier.label}: ${modifier.value}`, 44);
      for (const modifierLine of modifierLines) {
        writeTextLine(parts, `  ${modifierLine}`);
      }
    }

    writeTextLine(parts, line("-", COLUMNS));
  }
}

function writeReceiptTotals(parts: Buffer[], data: ReceiptData) {
  parts.push(align("R"));
  writeTextLine(parts, totalRow("Subtotaal", fmtCents(data.subtotal)));
  writeTextLine(parts, totalRow("Verzending", data.shippingMethod));
  writeTextLine(parts, line("-", 25));
  parts.push(bold(true));
  writeTextLine(parts, totalRow("Total", fmtCents(data.total)));
  parts.push(bold(false));
  writeTextLine(parts, line("=", 25));
}

export function formatReceiptEscPos(data: ReceiptData): Buffer {
  const parts: Buffer[] = [];

  parts.push(reset(), font("B"), leftMargin());
  writeReceiptHeader(parts, data);

  parts.push(bold(true), txt("INVOICE"), bold(false), feed(2));
  writeTextLine(parts, "Billing Address:");
  writeTextLine(parts, data.customerName);
  if (data.customerAddress) writeTextLine(parts, data.customerAddress);
  if (data.customerPostalCode && data.customerCity) {
    writeTextLine(parts, `${data.customerPostalCode} ${data.customerCity}`);
  }
  writeTextLine(parts, data.customerPhone);
  parts.push(feed());

  writeKeyValue(parts, "Order Number", data.orderNumber);
  writeKeyValue(parts, "Order Date", data.orderDate);
  writeKeyValue(parts, "Payment Method", data.paymentMethod);
  writeKeyValue(parts, "Order Type", data.shippingMethod);
  writeKeyValue(parts, "Order Time", data.orderTime);
  writeKeyValue(parts, "Pickup Time", data.pickupTime);
  parts.push(feed());

  writeReceiptItems(parts, data);
  parts.push(feed());
  writeReceiptTotals(parts, data);
  parts.push(feed(4), cut());

  return Buffer.concat(parts);
}

export function formatReceiptText(data: ReceiptData): string {
  const lines: string[] = [];
  const push = (value = "") => lines.push(value);

  push(headerRow("XIN CHAO", data.locationName));
  push(headerRow("Vietnamese Street Food", data.address));
  push(headerRow("", `${data.postalCode} ${data.city}`));
  push("");
  push("INVOICE");
  push("");
  push("Billing Address:");
  push(data.customerName);
  if (data.customerAddress) push(data.customerAddress);
  if (data.customerPostalCode && data.customerCity) push(`${data.customerPostalCode} ${data.customerCity}`);
  push(data.customerPhone);
  push("");
  push(`${padR("Order Number:", 17)}${data.orderNumber}`);
  push(`${padR("Order Date:", 17)}${data.orderDate}`);
  push(`${padR("Payment Method:", 17)}${data.paymentMethod}`);
  push(`${padR("Order Type:", 17)}${data.shippingMethod}`);
  push(`${padR("Order Time:", 17)}${data.orderTime}`);
  push(`${padR("Pickup Time:", 17)}${data.pickupTime}`);
  push("");
  push(row("Product", "Quantity", "Price"));

  for (const item of data.items) {
    const nameLines = wrapLines(item.name, 27);
    push(row(nameLines[0], String(item.quantity), fmtCents(item.price)));
    for (let i = 1; i < nameLines.length; i += 1) push(`  ${nameLines[i]}`);
    for (const modifier of item.modifiers || []) {
      for (const modifierLine of wrapLines(`${modifier.label}: ${modifier.value}`, 44)) {
        push(`  ${modifierLine}`);
      }
    }
    push(line("-"));
  }

  push(padL(totalRow("Subtotaal", fmtCents(data.subtotal)), COLUMNS));
  push(padL(totalRow("Verzending", data.shippingMethod), COLUMNS));
  push(padL(line("-", 25), COLUMNS));
  push(padL(totalRow("Total", fmtCents(data.total)), COLUMNS));
  push(padL(line("=", 25), COLUMNS));
  return lines.join("\n");
}

function parseLocationAddress(address: string, fallbackName: string) {
  const [streetPart, cityPart] = address.split(",").map((part) => part.trim());
  const postalMatch = cityPart?.match(/^(\d{4}\s?[A-Z]{2})\s+(.+)$/i);

  return {
    street: streetPart || address,
    postalCode: postalMatch?.[1]?.toUpperCase() || "",
    city: postalMatch?.[2] || fallbackName.replace(/^Xin Ch[aà]o\s+/i, ""),
  };
}

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
  const orderDate = order.createdAt.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const parsedAddress = parseLocationAddress(location.address, location.name);

  const items: ReceiptItem[] = order.items.map((item) => {
    const modifiers: { label: string; value: string }[] = [];
    if (item.variantName) modifiers.push({ label: "Keuze", value: item.variantName });
    if (item.modifierNames.length > 0) modifiers.push({ label: "Extras", value: item.modifierNames.join(", ") });

    return {
      name: item.menuItem.nameNl || item.menuItem.name,
      quantity: item.quantity,
      price: item.price,
      modifiers: modifiers.length ? modifiers : undefined,
    };
  });

  return {
    locationName: location.name,
    address: parsedAddress.street,
    postalCode: parsedAddress.postalCode,
    city: parsedAddress.city,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderNumber: order.id.slice(-5).toUpperCase(),
    orderDate,
    paymentMethod: "iDEAL | Wero",
    shippingMethod: "Pickup",
    orderTime: order.createdAt.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    pickupTime: pickupTime || "ASAP",
    items,
    subtotal: order.totalAmount,
    shipping: 0,
    total: order.totalAmount,
  };
}

export function getTestReceiptData(locationName = "Wageningen"): ReceiptData {
  return {
    locationName: `Xin Chào ${locationName}`,
    address: "Hoogstraat 18",
    postalCode: "6701 BT",
    city: locationName,
    customerName: "Julia Kerkhof",
    customerAddress: "Hoogstraat 52",
    customerPostalCode: "6701 BB",
    customerCity: locationName,
    customerPhone: "0615180734",
    orderNumber: "13982",
    orderDate: "19 mei 2026",
    paymentMethod: "iDEAL | Wero",
    shippingMethod: "Pickup",
    orderTime: "16:34:08",
    pickupTime: "17:30",
    items: [
      {
        name: "Vietnamese Fried Chicken Wings",
        quantity: 1,
        price: 895,
        modifiers: [{ label: "Kies je favoriete saus", value: "Butter Sauce" }],
      },
      { name: "Cha gio", quantity: 1, price: 795 },
      {
        name: "Goi Cuon",
        quantity: 2,
        price: 1390,
        modifiers: [{ label: "Vulling", value: "Gegrilde varkens citroengras" }],
      },
      {
        name: "Banh mi",
        quantity: 1,
        price: 800,
        modifiers: [{ label: "Hoofdbeleg", value: "Gegrilde chili kip" }],
      },
      {
        name: "Bun / Com",
        quantity: 1,
        price: 1095,
        modifiers: [
          { label: "Basis keuze", value: "Rijstnoedels" },
          { label: "Toppings (+ € 0,50)", value: "Gestoofde rundvlees" },
          { label: "Glutenallergie", value: "Ja" },
        ],
      },
      {
        name: "Goi Cuon",
        quantity: 1,
        price: 695,
        modifiers: [{ label: "Vulling", value: "Garnalen en ei" }],
      },
    ],
    subtotal: 5670,
    shipping: 0,
    total: 5670,
  };
}
