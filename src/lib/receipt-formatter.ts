/**
 * Receipt formatter for Epson TM-T20III ESC/POS printing.
 * Paper: 80mm thermal. Font A is used for readability.
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
const COLUMNS = 42;

function bytes(...vals: number[]): Buffer {
  return Buffer.from(vals);
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function txt(str: string): Buffer {
  return Buffer.from(stripDiacritics(str), "latin1");
}

const reset = () => bytes(ESC, 0x40);
const cut = () => bytes(GS, 0x56, 0x41, 0x00);
const feed = (n = 1) => Buffer.concat(Array(n).fill(bytes(LF)));
const bold = (on: boolean) => bytes(ESC, 0x45, on ? 1 : 0);
const align = (pos: "L" | "C" | "R") => bytes(ESC, 0x61, pos === "L" ? 0 : pos === "C" ? 1 : 2);
const font = (type: "A" | "B") => bytes(ESC, 0x4D, type === "B" ? 1 : 0);
const inverse = (on: boolean) => bytes(GS, 0x42, on ? 1 : 0);
const leftMargin = () => bytes(GS, 0x4C, 0x00, 0x00);

const fmtCents = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const padR = (value: string, width: number) => value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
const padL = (value: string, width: number) => value.length > width ? value.slice(0, width) : value.padStart(width);
const line = (char: string, width = COLUMNS) => char.repeat(width);
const row = (left: string, qty: string, price: string) => `${padR(left, 25)}${padL(qty, 5)}${padL(price, 12)}`;
const totalRow = (label: string, value: string) => `${padR(label, 10)}${padL(value, 12)}`;

function center(value: string) {
  return padL(value, Math.floor((COLUMNS + value.length) / 2)).padEnd(COLUMNS);
}

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
  parts.push(bold(true), txt(padR(`${key}:`, 16)), bold(false), txt(value), feed());
}

function writeReceiptHeader(parts: Buffer[], data: ReceiptData) {
  parts.push(align("C"), bold(true));
  writeTextLine(parts, data.locationName);
  parts.push(bold(false));
  writeTextLine(parts, data.address);
  writeTextLine(parts, `${data.postalCode} ${data.city}`);
  parts.push(feed(), align("L"));
}

function writeModifier(parts: Buffer[], modifier: { label: string; value: string }) {
  const prefix = `${modifier.label}: `;
  const lines = wrapLines(`${prefix}${modifier.value}`, COLUMNS - 2);
  for (const modifierLine of lines) {
    writeTextLine(parts, `  ${modifierLine}`);
  }
}

function writeReceiptItems(parts: Buffer[], data: ReceiptData) {
  parts.push(inverse(true), bold(true), txt(row("Product", "Qty", "Price")), bold(false), inverse(false), feed());

  for (const item of data.items) {
    const nameLines = wrapLines(item.name, 25);
    parts.push(bold(true), txt(row(nameLines[0], String(item.quantity), fmtCents(item.price))), bold(false), feed());
    for (let i = 1; i < nameLines.length; i += 1) {
      writeTextLine(parts, `  ${nameLines[i]}`);
    }

    for (const modifier of item.modifiers || []) writeModifier(parts, modifier);
    writeTextLine(parts, line("-"));
  }
}

function writeReceiptTotals(parts: Buffer[], data: ReceiptData) {
  parts.push(align("R"));
  writeTextLine(parts, totalRow("Subtotal", fmtCents(data.subtotal)));
  writeTextLine(parts, line("-", 22));
  parts.push(bold(true));
  writeTextLine(parts, totalRow("Total", fmtCents(data.total)));
  parts.push(bold(false));
  writeTextLine(parts, line("=", 22));
}

export function formatReceiptEscPos(data: ReceiptData): Buffer {
  const parts: Buffer[] = [];

  parts.push(reset(), font("A"), leftMargin());
  writeReceiptHeader(parts, data);

  parts.push(bold(true), txt("INVOICE"), bold(false), feed(2));
  writeTextLine(parts, "Customer Info:");
  writeTextLine(parts, data.customerName);
  if (data.customerAddress) writeTextLine(parts, data.customerAddress);
  if (data.customerPostalCode && data.customerCity) writeTextLine(parts, `${data.customerPostalCode} ${data.customerCity}`);
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

  push(center(data.locationName));
  push(center(data.address));
  push(center(`${data.postalCode} ${data.city}`));
  push("");
  push("INVOICE");
  push("");
  push("Customer Info:");
  push(data.customerName);
  if (data.customerAddress) push(data.customerAddress);
  if (data.customerPostalCode && data.customerCity) push(`${data.customerPostalCode} ${data.customerCity}`);
  push(data.customerPhone);
  push("");
  push(`${padR("Order Number:", 16)}${data.orderNumber}`);
  push(`${padR("Order Date:", 16)}${data.orderDate}`);
  push(`${padR("Payment Method:", 16)}${data.paymentMethod}`);
  push(`${padR("Order Type:", 16)}${data.shippingMethod}`);
  push(`${padR("Order Time:", 16)}${data.orderTime}`);
  push(`${padR("Pickup Time:", 16)}${data.pickupTime}`);
  push("");
  push(row("Product", "Qty", "Price"));

  for (const item of data.items) {
    const nameLines = wrapLines(item.name, 25);
    push(row(nameLines[0], String(item.quantity), fmtCents(item.price)));
    for (let i = 1; i < nameLines.length; i += 1) push(`  ${nameLines[i]}`);
    for (const modifier of item.modifiers || []) {
      for (const modifierLine of wrapLines(`${modifier.label}: ${modifier.value}`, COLUMNS - 2)) push(`  ${modifierLine}`);
    }
    push(line("-"));
  }

  push(padL(totalRow("Subtotal", fmtCents(data.subtotal)), COLUMNS));
  push(padL(line("-", 22), COLUMNS));
  push(padL(totalRow("Total", fmtCents(data.total)), COLUMNS));
  push(padL(line("=", 22), COLUMNS));
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

function isGlutenFreeLabel(label: string) {
  const normalized = label.toLowerCase().replace(/[\s_-]/g, "");
  return normalized === "glutenfree" || normalized === "glutenvrij" || normalized === "glutenvrije";
}

function cleanExclusionLabel(label: string) {
  const cleaned = label.trim().replace(/^(no|geen)\s+/i, "");
  if (isGlutenFreeLabel(cleaned)) return cleaned;
  return `No ${cleaned}`;
}

function parseCustomerAddress(notes?: string | null) {
  const lines = (notes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const addressLine = lines.find((line) => /^(adres|address)\s*:/i.test(line));
  const postalCityLine = lines.find((line) => /^(postcode\/plaats|postal code\/city)\s*:/i.test(line));
  const address = addressLine?.replace(/^(adres|address)\s*:\s*/i, "").trim() || "";
  const postalCity = postalCityLine?.replace(/^(postcode\/plaats|postal code\/city)\s*:\s*/i, "").trim() || "";
  const postalCityMatch = postalCity.match(/^(\d{4}\s?[A-Z]{2})\s+(.+)$/i);

  return {
    address,
    postalCode: postalCityMatch?.[1]?.toUpperCase() || "",
    city: postalCityMatch?.[2] || postalCity,
  };
}

export function buildReceiptFromOrder(
  order: {
    id: string;
    orderNumber?: string | null;
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
      exclusionNames?: string[];
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
    timeZone: "Europe/Amsterdam",
  });
  const parsedAddress = parseLocationAddress(location.address, location.name);
  const customerAddress = parseCustomerAddress(order.notes);

  const items: ReceiptItem[] = order.items.map((item) => {
    const modifiers: { label: string; value: string }[] = [];
    if (item.variantName) modifiers.push({ label: "Option", value: item.variantName });
    if (item.modifierNames.length > 0) modifiers.push({ label: "Extras", value: item.modifierNames.join(", ") });
    if (item.exclusionNames?.length) {
      modifiers.push({ label: "Customize", value: item.exclusionNames.map(cleanExclusionLabel).join(", ") });
    }

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
    customerAddress: customerAddress.address || undefined,
    customerPostalCode: customerAddress.postalCode || undefined,
    customerCity: customerAddress.city || undefined,
    customerPhone: order.customerPhone,
    orderNumber: order.orderNumber || order.id.slice(-8).toUpperCase(),
    orderDate,
    paymentMethod: "iDEAL | Wero",
    shippingMethod: "Pickup",
    orderTime: order.createdAt.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Amsterdam",
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
    customerName: "Lan Nguyen",
    customerPhone: "0617544166",
    orderNumber: "2A14C",
    orderDate: "21 mei 2026",
    paymentMethod: "iDEAL | Wero",
    shippingMethod: "Pickup",
    orderTime: "12:21:26",
    pickupTime: "18:15",
    items: [
      {
        name: "Bánh Mì",
        quantity: 1,
        price: 975,
        modifiers: [
          { label: "Option", value: "Curry Tempeh" },
          { label: "Extras", value: "Extra Fried Egg" },
          { label: "Customize", value: "No Egg, No Cucumber, No Coriander, No Chili" },
        ],
      },
      {
        name: "Bún Xin Chào",
        quantity: 1,
        price: 1545,
        modifiers: [
          { label: "Option", value: "Là Vọng Fish" },
          { label: "Customize", value: "Glutenfree, No Egg, No Coriander, No Mayonaise" },
        ],
      },
    ],
    subtotal: 2520,
    shipping: 0,
    total: 2520,
  };
}
