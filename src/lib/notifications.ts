import nodemailer from "nodemailer";
import { cleanExclusionLabel } from "@/lib/cart-display";
import { createReservationEditToken } from "@/lib/reservation-edit-token";

const smtpHost = process.env.SMTP_HOST ?? "smtp.transip.email";
const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "hello@xinchao.nl";
const formattedEmailFrom = emailFrom.includes("<") ? emailFrom : `"Xin Chao" <${emailFrom}>`;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

async function sendEmail(args: {
  to: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  if (!smtpUser || !smtpPass) {
    console.warn("[EMAIL] No SMTP_USER or SMTP_PASS configured; skipping email");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: formattedEmailFrom,
      to: args.to,
      bcc: args.bcc,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });
    console.log("[EMAIL] Sent:", info.messageId);
  } catch (err: any) {
    console.error("[EMAIL] Failed to send:", err.message);
    throw err;
  }
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatReservationEmailDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date.replace(/\//g, ".");
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(parsed).replace(/\//g, ".");
}

function formatReservationLongDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date.replace(/\//g, "-");
  }

  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(parsed);
}

function reservationNumber(args: {
  reservationId?: string;
  date: string;
  time: string;
  locationSlug?: string;
}) {
  const parsed = new Date(args.date);
  const prefix = args.locationSlug === "utrecht" ? "XCU" : "XCW";
  const timeCode = args.time.replace(/\D/g, "").padEnd(4, "0").slice(0, 4);

  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = String(parsed.getFullYear()).slice(-2);
    return `${prefix}-${day}${month}${year}-${timeCode}`;
  }

  const suffix = args.reservationId?.slice(-6).toUpperCase() || timeCode;
  return `${prefix}-${suffix}`;
}

function splitAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    street: parts[0] || address,
    postalCity: parts.slice(1).join(", "),
  };
}

function reservationLocationImage(slug?: string) {
  return slug === "utrecht" ? "/images/utrecht-exterior.jpg" : "/images/wageningen-exterior.jpg";
}

function locationCopyEmail(locationSlug?: string, locationName?: string) {
  const locationKey = `${locationSlug || ""} ${locationName || ""}`.toLowerCase();
  if (locationKey.includes("utrecht")) return "utrecht@xinchao.nl";
  if (locationKey.includes("wageningen")) return "wageningen@xinchao.nl";
  return undefined;
}

function buildCalendarUrl(args: {
  customerName: string;
  partySize: number;
  date: string;
  time: string;
  location: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://xinchao.nl";
  const fallbackUrl = `${baseUrl.replace(/\/$/, "")}/nl/reserve`;
  const isoMatch = args.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const shortMatch = args.date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  const timeMatch = args.time.match(/^(\d{1,2}):(\d{2})/);

  if ((!isoMatch && !shortMatch) || !timeMatch) {
    return fallbackUrl;
  }

  const year = isoMatch ? isoMatch[1] : shortMatch?.[3];
  const month = isoMatch ? isoMatch[2] : shortMatch?.[2];
  const day = isoMatch ? isoMatch[3] : shortMatch?.[1];
  if (!year || !month || !day) return fallbackUrl;

  const startHour = Number(timeMatch[1]);
  const startMinute = Number(timeMatch[2]);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = startMinutes + 2 * 60;
  const stamp = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
  };
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Reservering bij Xin Chao - ${args.location}`,
    dates: `${stamp(startMinutes)}/${stamp(endMinutes)}`,
    details: `Reservering voor ${args.customerName}, ${args.partySize} gasten.`,
    location: args.location,
    ctz: "Europe/Amsterdam",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatEmailPrice(value: number) {
  return `€ ${value.toFixed(2).replace(".", ",")}`;
}

function formatOrderDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(parsed);
}

type OrderEmailItem = {
  name: string;
  qty: number;
  unitPrice?: number;
  variantName?: string | null;
  modifierNames?: string[];
  exclusionNames?: string[];
};

function formatOrderItemChoices(item: OrderEmailItem) {
  return [
    item.variantName || "",
    ...(item.modifierNames || []),
    ...(item.exclusionNames || []).map(cleanExclusionLabel),
  ].filter(Boolean);
}

function buildOrderPaidHtml(args: {
  orderId: string;
  orderNumber?: string | null;
  customerName: string;
  total: number;
  items: OrderEmailItem[];
  location: string;
  pickupDate: string;
  pickupTime: string;
}) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://xinchao.nl").replace(/\/$/, "");
  const logoUrl = `${baseUrl}/images/logo.png`;
  const shortOrderId = args.orderNumber || args.orderId.slice(-8).toUpperCase();
  const subtotal = args.total / 1.09;
  const tax = args.total - subtotal;
  const itemRows = args.items.map((item) => {
    const choices = formatOrderItemChoices(item);
    const lineTotal = item.unitPrice === undefined ? "" : formatEmailPrice(item.unitPrice * item.qty);
    return `<tr>
      <td style="padding:14px 0;border-bottom:1px solid #E5E7EB;color:#4B5563;font-size:13px;line-height:1.45;">
        <strong style="color:#374151;">${escapeHtml(item.qty)}x</strong>
      </td>
      <td style="padding:14px 12px;border-bottom:1px solid #E5E7EB;color:#374151;font-size:13px;line-height:1.45;">
        <strong>${escapeHtml(item.name)}</strong>
        ${choices.length > 0 ? `<div style="margin-top:6px;color:#6B7280;font-size:12px;line-height:1.5;">${choices.map(escapeHtml).join(" &middot; ")}</div>` : ""}
      </td>
      <td align="right" style="padding:14px 0;border-bottom:1px solid #E5E7EB;color:#374151;font-size:13px;line-height:1.45;white-space:nowrap;">
        ${escapeHtml(lineTotal)}
      </td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bedankt voor je bestelling</title>
  </head>
  <body style="margin:0;background:#F4F4F4;color:#4B5563;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
      Bedankt voor je bestelling. Jouw gekozen gerechten worden vers voor jou gemaakt.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F4;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;">
            <tr>
              <td align="center" style="padding:20px 28px 8px;">
                <img src="${escapeHtml(logoUrl)}" width="165" alt="Xin Chao" style="display:block;border:0;max-width:165px;height:auto;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 32px 0;">
                <h1 style="margin:0 0 16px;font-size:25px;line-height:1.25;font-weight:800;color:#4A4A4A;">
                  Bedankt voor je bestelling!
                </h1>
                <div style="height:1px;background:#E5E7EB;line-height:1px;font-size:1px;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 34px 18px;">
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#777777;">Beste ${escapeHtml(args.customerName)},</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#777777;">
                  Bedankt voor je bestelling! Jouw gekozen gerechten worden vers voor jou gemaakt en dat proef je meteen. Wij gaan aan de slag om deze zo snel mogelijk voor jou klaar te hebben.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">
                  <tr>
                    <td align="center" width="33.33%" style="padding:18px 8px;">
                      <div style="font-size:13px;line-height:1.2;font-weight:800;color:#009846;">Order Nr</div>
                      <div style="margin-top:8px;font-size:13px;color:#777777;">${escapeHtml(shortOrderId)}</div>
                    </td>
                    <td align="center" width="33.33%" style="padding:18px 8px;">
                      <div style="font-size:13px;line-height:1.2;font-weight:800;color:#009846;">Ophaaltijdstip</div>
                      <div style="margin-top:8px;font-size:13px;color:#777777;">${escapeHtml(formatOrderDate(args.pickupDate))} ${escapeHtml(args.pickupTime)}</div>
                    </td>
                    <td align="center" width="33.33%" style="padding:18px 8px;">
                      <div style="font-size:13px;line-height:1.2;font-weight:800;color:#009846;">Betaalwijze</div>
                      <div style="margin-top:8px;font-size:13px;color:#777777;">iDEAL</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${itemRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:8px 0;color:#555555;font-size:13px;">Subtotaal</td>
                    <td align="right" style="padding:8px 0;color:#555555;font-size:13px;">${escapeHtml(formatEmailPrice(subtotal))}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#555555;font-size:13px;">BTW (9%)</td>
                    <td align="right" style="padding:8px 0;color:#555555;font-size:13px;">${escapeHtml(formatEmailPrice(tax))}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 4px;border-top:1px solid #E5E7EB;color:#333333;font-size:14px;font-weight:800;">Totaal</td>
                    <td align="right" style="padding:12px 0 4px;border-top:1px solid #E5E7EB;color:#333333;font-size:14px;font-weight:800;">${escapeHtml(formatEmailPrice(args.total))}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 32px 32px;border-top:1px solid #E5E7EB;">
                <p style="margin:0 0 6px;font-size:16px;line-height:1.4;color:#4A4A4A;font-weight:800;">
                  Je bestelling wordt klaargemaakt bij:
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#777777;">
                  <strong style="color:#B48720;">Xin Chao</strong><br>
                  ${escapeHtml(args.location)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendOrderPendingEmail(args: {
  to: string;
  orderId: string;
  orderNumber?: string | null;
  customerName: string;
  total: number;
  items: { name: string; qty: number }[];
  location: string;
  pickupDate: string;
  pickupTime: string;
  paymentUrl: string;
}) {
  const { to, orderId, orderNumber, customerName, total, items, location, pickupDate, pickupTime, paymentUrl } = args;
  const displayedOrderNumber = orderNumber || orderId.slice(-8).toUpperCase();
  const itemList = items.map((item) => `${item.qty}x ${item.name}`).join("\n");
  const body = `Hi ${customerName},

Your order has been received. Please complete payment using the link below.
Order ID: ${displayedOrderNumber}
Total: EUR ${total.toFixed(2).replace(".", ",")}
Location: ${location}
Pickup: ${pickupDate} at ${pickupTime}

Items:
${itemList}

Payment link:
${paymentUrl}

Thank you for ordering!
Xin Chao Vietnamese Restaurant
`;
  await sendEmail({ to, subject: `Order Received - ${displayedOrderNumber}`, text: body });
}

export async function sendOrderPaidEmail(args: {
  to: string;
  orderId: string;
  orderNumber?: string | null;
  customerName: string;
  total: number;
  items: OrderEmailItem[];
  location: string;
  locationSlug?: string;
  pickupDate: string;
  pickupTime: string;
}) {
  const { to, orderId, orderNumber, customerName, total, items, location, locationSlug, pickupDate, pickupTime } = args;
  const displayedOrderNumber = orderNumber || orderId.slice(-8).toUpperCase();
  const itemList = items.map((item) => {
    const choices = formatOrderItemChoices(item);
    return `${item.qty}x ${item.name}${choices.length > 0 ? ` - ${choices.join(", ")}` : ""}`;
  }).join("\n");
  const body = `Hi ${customerName},

Bedankt voor je bestelling!
Order ID: ${displayedOrderNumber}
Total: EUR ${total.toFixed(2).replace(".", ",")}
Location: ${location}
Ophaaltijdstip: ${pickupDate} at ${pickupTime}

Items:
${itemList}

Jouw gekozen gerechten worden vers voor jou gemaakt en dat proef je meteen. Wij gaan aan de slag om deze zo snel mogelijk voor jou klaar te hebben.

Thank you!
Xin Chao Vietnamese Restaurant
`;
  await sendEmail({
    to,
    bcc: locationCopyEmail(locationSlug, location),
    subject: "Bedankt voor je bestelling",
    text: body,
    html: buildOrderPaidHtml(args),
  });
}

export async function sendReservationEmail(args: {
  to: string;
  reservationId?: string;
  customerName: string;
  partySize: number;
  date: string;
  time: string;
  location: string;
  locationSlug?: string;
  restaurantAddress?: string;
  restaurantEmail?: string;
  restaurantPhone: string;
  notes?: string | null;
}) {
  const {
    to,
    reservationId,
    customerName,
    partySize,
    date,
    time,
    location,
    locationSlug,
    restaurantAddress,
    restaurantEmail,
    restaurantPhone,
    notes,
  } = args;
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://xinchao.nl").replace(/\/$/, "");
  const logoUrl = `${baseUrl}/images/logo.png`;
  const locationImageUrl = `${baseUrl}${reservationLocationImage(locationSlug)}`;
  const displayDate = formatReservationEmailDate(date);
  const longDate = formatReservationLongDate(date);
  const code = reservationNumber({ reservationId, date, time, locationSlug });
  const address = restaurantAddress || (locationSlug === "utrecht" ? "Voor Clarenburg 6, 3511 JE Utrecht" : "Hoogstraat 18, 6701 BT Wageningen");
  const addressParts = splitAddress(address);
  const shownEmail = restaurantEmail || "hello@xinchao.nl";
  const shownPhone = restaurantPhone || (locationSlug === "utrecht" ? "+31 30 785 7092" : "+31 317 225 008");
  const specialRequest = notes?.trim() || "";
  const calendarUrl = buildCalendarUrl({ customerName, partySize, date, time, location });
  const editUrl = reservationId
    ? `${baseUrl}/nl/reserve?edit=${encodeURIComponent(reservationId)}&token=${encodeURIComponent(createReservationEditToken(reservationId))}`
    : `${baseUrl}/nl/reserve`;
  const cancelUrl = `mailto:${shownEmail}?subject=${encodeURIComponent(`Reservering annuleren - ${code}`)}`;
  const routeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location} ${address}`)}`;
  const body = `Hi ${customerName},

Je reservering bij ${location} is bevestigd.

Datum: ${displayDate}
Tijd: ${time}
Gasten: ${partySize}
Naam gast: ${customerName}
Reserveringsnummer: ${code}
${specialRequest ? `Speciale verzoeken: ${specialRequest}\n` : ""}

Wil je iets wijzigen? Bel ons op ${shownPhone}.

Tot snel!
Xin Chao Vietnamese Restaurant
`;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Je reservering is bevestigd</title>
  </head>
  <body style="margin:0;background:#F7F5F1;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
      Je reservering bij ${escapeHtml(location)} is bevestigd.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F5F1;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:900px;background:#ffffff;border-radius:10px;box-shadow:0 18px 54px rgba(20,20,20,0.08);">
            <tr>
              <td align="center" style="padding:28px 30px 10px;">
                <img src="${escapeHtml(logoUrl)}" width="170" alt="Xin Chao" style="display:block;border:0;max-width:170px;height:auto;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 30px 14px;">
                <div style="display:inline-block;border-radius:999px;background:#FDE8E8;color:#E30613;font-size:15px;font-weight:800;line-height:1;padding:12px 26px;">
                  <span style="display:inline-block;width:18px;height:18px;border-radius:999px;background:#E30613;color:#ffffff;text-align:center;line-height:18px;margin-right:10px;">&#10003;</span>
                  Reservering bevestigd
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 30px 18px;">
                <h1 style="margin:0;font-size:42px;line-height:1.08;font-weight:900;letter-spacing:-0.04em;color:#141414;">
                  Je reservering is bevestigd
                </h1>
                <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#6B7280;">
                  We kijken ernaar uit je te verwelkomen bij ${escapeHtml(location)}.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 30px 22px;">
                <div style="display:inline-block;border:1px solid #F1DFC0;border-radius:999px;background:#FFF6E8;color:#141414;font-size:18px;line-height:1.2;font-weight:800;padding:14px 26px;">
                  &#127915;&nbsp; Reserveringsnummer: <span style="color:#E30613;">${escapeHtml(code)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E8E4DF;border-radius:12px;box-shadow:0 10px 26px rgba(20,20,20,0.06);overflow:hidden;">
                  <tr>
                    <td width="33.33%" style="padding:20px 18px;border-right:1px solid #E8E4DF;border-bottom:1px solid #E8E4DF;">
                      <div style="font-size:14px;color:#6B7280;">&#128197;&nbsp; Datum</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">${escapeHtml(longDate)}</div>
                    </td>
                    <td width="33.33%" style="padding:20px 18px;border-right:1px solid #E8E4DF;border-bottom:1px solid #E8E4DF;">
                      <div style="font-size:14px;color:#6B7280;">&#128339;&nbsp; Tijd</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">${escapeHtml(time)}</div>
                    </td>
                    <td width="33.33%" style="padding:20px 18px;border-bottom:1px solid #E8E4DF;">
                      <div style="font-size:14px;color:#6B7280;">&#128101;&nbsp; Aantal gasten</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">${escapeHtml(partySize)} ${partySize === 1 ? "persoon" : "personen"}</div>
                    </td>
                  </tr>
                  <tr>
                    <td width="33.33%" style="padding:20px 18px;border-right:1px solid #E8E4DF;">
                      <div style="font-size:14px;color:#6B7280;">&#128100;&nbsp; Naam gast</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">${escapeHtml(customerName)}</div>
                    </td>
                    <td width="33.33%" style="padding:20px 18px;border-right:1px solid #E8E4DF;">
                      <div style="font-size:14px;color:#6B7280;">&#128205;&nbsp; Locatie</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">${escapeHtml(location)}</div>
                    </td>
                    <td width="33.33%" style="padding:20px 18px;">
                      <div style="font-size:14px;color:#6B7280;">&#127869;&nbsp; Type</div>
                      <div style="margin-top:7px;font-size:18px;font-weight:900;color:#141414;">Tafelreservering</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${specialRequest ? `
            <tr>
              <td style="padding:0 30px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #F1DFC0;border-radius:12px;background:#FFF9EF;overflow:hidden;">
                  <tr>
                    <td style="padding:18px 22px;">
                      <div style="font-size:14px;line-height:1.4;color:#6B7280;margin-bottom:7px;">&#9998;&nbsp; Speciale verzoeken</div>
                      <div style="font-size:16px;line-height:1.55;font-weight:700;color:#141414;">${escapeHtml(specialRequest).replace(/\n/g, "<br>")}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>` : ""}
            <tr>
              <td style="padding:0 30px 14px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E8E4DF;border-radius:12px;box-shadow:0 10px 26px rgba(20,20,20,0.06);overflow:hidden;">
                  <tr>
                    <td width="25%" style="padding:14px;">
                      <img src="${escapeHtml(locationImageUrl)}" width="210" alt="${escapeHtml(location)}" style="display:block;width:100%;max-width:210px;height:auto;border-radius:8px;border:0;">
                    </td>
                    <td width="45%" style="padding:14px 16px;">
                      <div style="font-size:20px;font-weight:900;color:#141414;margin-bottom:12px;">${escapeHtml(location)}</div>
                      <div style="font-size:15px;line-height:1.8;color:#4B5563;">&#128205;&nbsp; ${escapeHtml(address)}</div>
                      <div style="font-size:15px;line-height:1.8;color:#4B5563;">&#128222;&nbsp; ${escapeHtml(shownPhone)}</div>
                      <div style="font-size:15px;line-height:1.8;color:#4B5563;">&#9993;&nbsp; ${escapeHtml(shownEmail)}</div>
                      <div style="font-size:14px;line-height:1.5;color:#6B7280;margin-top:8px;">Meld je bij aankomst even bij ons team.</div>
                    </td>
                    <td width="30%" style="padding:14px 18px;">
                      <a href="${escapeHtml(routeUrl)}" style="display:block;text-align:center;text-decoration:none;border:1px solid #E30613;border-radius:8px;color:#E30613;font-size:15px;font-weight:800;padding:16px 12px;margin-bottom:12px;">
                        &#10148;&nbsp; Route bekijken
                      </a>
                      <a href="tel:${escapeHtml(shownPhone.replace(/\s+/g, ""))}" style="display:block;text-align:center;text-decoration:none;border:1px solid #E30613;border-radius:8px;color:#E30613;font-size:15px;font-weight:800;padding:16px 12px;">
                        &#128222;&nbsp; Bel restaurant
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 14px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E8E4DF;border-radius:12px;box-shadow:0 10px 26px rgba(20,20,20,0.06);overflow:hidden;">
                  <tr>
                    <td align="center" width="33.33%" style="padding:18px 14px;border-right:1px solid #E8E4DF;">
                      <a href="${escapeHtml(calendarUrl)}" style="text-decoration:none;color:#141414;font-size:15px;font-weight:800;">&#128197;&nbsp; Aan kalender toevoegen &nbsp;<span style="color:#E30613;">&#8250;</span></a>
                    </td>
                    <td align="center" width="33.33%" style="padding:18px 14px;border-right:1px solid #E8E4DF;">
                      <a href="${escapeHtml(editUrl)}" style="text-decoration:none;color:#141414;font-size:15px;font-weight:800;">&#9998;&nbsp; Reservering wijzigen &nbsp;<span style="color:#E30613;">&#8250;</span></a>
                    </td>
                    <td align="center" width="33.33%" style="padding:18px 14px;">
                      <a href="${escapeHtml(cancelUrl)}" style="text-decoration:none;color:#141414;font-size:15px;font-weight:800;">&#10006;&nbsp; Reservering annuleren &nbsp;<span style="color:#E30613;">&#8250;</span></a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 22px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E8E4DF;border-radius:12px;box-shadow:0 10px 26px rgba(20,20,20,0.06);">
                  <tr>
                    <td style="padding:20px 24px;">
                      <div style="font-size:20px;font-weight:900;color:#141414;margin-bottom:14px;">&#8505;&nbsp; Goed om te weten</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td width="50%" style="font-size:14px;line-height:1.7;color:#4B5563;padding:5px 18px 5px 0;">&#128339;&nbsp; Kom bij voorkeur 5 minuten voor aanvang.</td>
                          <td width="50%" style="font-size:14px;line-height:1.7;color:#4B5563;padding:5px 0 5px 18px;">&#127811;&nbsp; Dieetwensen of allergie&euml;n? Laat het ons weten tijdens het bestellen.</td>
                        </tr>
                        <tr>
                          <td width="50%" style="font-size:14px;line-height:1.7;color:#4B5563;padding:5px 18px 5px 0;">&#128276;&nbsp; Kun je niet komen? Laat het ons op tijd weten.</td>
                          <td width="50%" style="font-size:14px;line-height:1.7;color:#4B5563;padding:5px 0 5px 18px;">&#9201;&nbsp; Je tafel wordt 15 minuten vastgehouden na de gereserveerde tijd.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 30px 30px;border-top:1px solid #E8E4DF;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#4B5563;">
                  <strong style="color:#E30613;font-size:20px;">xin ch&agrave;o</strong>
                  &nbsp;&nbsp; ${escapeHtml(location)} &nbsp;&bull;&nbsp; ${escapeHtml(addressParts.street)}${addressParts.postalCity ? ` &nbsp;&bull;&nbsp; ${escapeHtml(shownPhone)}` : ""}
                </p>
                <p style="margin:6px 0 0;font-size:12px;line-height:1.6;color:#6B7280;">
                  Deze bevestiging is automatisch verstuurd. Bewaar deze e-mail voor je administratie.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail({
    to,
    bcc: locationCopyEmail(locationSlug, location),
    subject: `Je reservering bij ${location} is bevestigd`,
    text: body,
    html,
  });
}

export async function sendAccountCreatedEmail(args: {
  to: string;
  customerName: string;
}) {
  const { to, customerName } = args;
  const body = `Hi ${customerName},

Your Xin Chao account has been created.

You can now sign in faster, view your orders, and check out more quickly next time.

Thank you!
Xin Chao Vietnamese Restaurant
`;
  await sendEmail({ to, subject: "Your Xin Chao account is ready", text: body });
}
