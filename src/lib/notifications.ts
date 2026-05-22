import nodemailer from "nodemailer";

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

export async function sendOrderPendingEmail(args: {
  to: string;
  orderId: string;
  customerName: string;
  total: number;
  items: { name: string; qty: number }[];
  location: string;
  pickupDate: string;
  pickupTime: string;
  paymentUrl: string;
}) {
  const { to, orderId, customerName, total, items, location, pickupDate, pickupTime, paymentUrl } = args;
  const itemList = items.map((item) => `${item.qty}x ${item.name}`).join("\n");
  const body = `Hi ${customerName},

Your order has been received. Please complete payment using the link below.
Order ID: ${orderId}
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
  await sendEmail({ to, subject: `Order Received - ${orderId}`, text: body });
}

export async function sendOrderPaidEmail(args: {
  to: string;
  orderId: string;
  customerName: string;
  total: number;
  items: { name: string; qty: number }[];
  location: string;
  pickupDate: string;
  pickupTime: string;
}) {
  const { to, orderId, customerName, total, items, location, pickupDate, pickupTime } = args;
  const itemList = items.map((item) => `${item.qty}x ${item.name}`).join("\n");
  const body = `Hi ${customerName},

Payment confirmed!
Order ID: ${orderId}
Total: EUR ${total.toFixed(2).replace(".", ",")}
Location: ${location}
Pickup: ${pickupDate} at ${pickupTime}

Items:
${itemList}

Your food will be ready at the pickup time.

Thank you!
Xin Chao Vietnamese Restaurant
`;
  await sendEmail({ to, subject: `Payment Confirmed - ${orderId}`, text: body });
}

export async function sendReservationEmail(args: {
  to: string;
  customerName: string;
  partySize: number;
  date: string;
  time: string;
  location: string;
  restaurantPhone: string;
}) {
  const { to, customerName, partySize, date, time, location, restaurantPhone } = args;
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://xinchao.nl").replace(/\/$/, "");
  const logoUrl = `${baseUrl}/images/logo.png`;
  const displayDate = formatReservationEmailDate(date);
  const calendarUrl = buildCalendarUrl({ customerName, partySize, date, time, location });
  const editUrl = `${baseUrl}/nl/reserve`;
  const cancelUrl = `mailto:info@xinchaorestaurant.nl?subject=${encodeURIComponent(`Reservering annuleren - ${displayDate} ${time}`)}`;
  const body = `Hi ${customerName},

Je reservering bij ${location} is bevestigd.

Datum: ${displayDate}
Tijd: ${time}
Gasten: ${partySize}
Naam gast: ${customerName}

Wil je iets wijzigen? Bel ons op ${restaurantPhone}.

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
  <body style="margin:0;background:#ffffff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
      Je reservering bij ${escapeHtml(location)} is bevestigd.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:42px 18px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
            <tr>
              <td align="center" style="padding-bottom:30px;">
                <img src="${escapeHtml(logoUrl)}" width="160" alt="Xin Chao" style="display:block;border:0;max-width:160px;height:auto;">
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:38px;">
                <h1 style="margin:0;font-size:34px;line-height:1.18;font-weight:800;letter-spacing:-0.03em;color:#475569;">
                  Je <span style="background:#FFE7A3;color:#111827;padding:0 6px;">reservering</span> is bevestigd
                </h1>
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="33.33%" valign="top" style="padding:0 14px 30px 0;">
                      <div style="font-size:14px;line-height:1.2;font-weight:700;color:#97A1AF;text-transform:uppercase;">Datum</div>
                      <div style="margin-top:14px;font-size:20px;line-height:1.3;font-weight:700;color:#334155;">${escapeHtml(displayDate)}</div>
                    </td>
                    <td width="33.33%" valign="top" style="padding:0 14px 30px;">
                      <div style="font-size:14px;line-height:1.2;font-weight:700;color:#97A1AF;text-transform:uppercase;">Tijd</div>
                      <div style="margin-top:14px;font-size:20px;line-height:1.3;font-weight:700;color:#334155;">${escapeHtml(time)}</div>
                    </td>
                    <td width="33.33%" valign="top" style="padding:0 0 30px 14px;">
                      <div style="font-size:14px;line-height:1.2;font-weight:700;color:#97A1AF;text-transform:uppercase;">Gasten</div>
                      <div style="margin-top:14px;font-size:20px;line-height:1.3;font-weight:700;color:#334155;">${escapeHtml(partySize)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding:2px 0 34px;">
                      <div style="font-size:14px;line-height:1.2;font-weight:700;color:#97A1AF;text-transform:uppercase;">Naam gast</div>
                      <div style="margin-top:14px;font-size:20px;line-height:1.4;color:#334155;">${escapeHtml(customerName)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding:0 0 26px;">
                      <div style="height:1px;background:#E2E8F0;line-height:1px;font-size:1px;">&nbsp;</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" width="33.33%" style="padding:0 8px;">
                      <a href="${escapeHtml(calendarUrl)}" style="display:inline-block;text-decoration:none;color:#334155;">
                        <div style="font-size:31px;line-height:1;color:#F5B942;">&#128197;</div>
                        <div style="margin-top:11px;font-size:15px;line-height:1.35;color:#334155;">Aan kalender toevoegen</div>
                      </a>
                    </td>
                    <td align="center" width="33.33%" style="padding:0 8px;">
                      <a href="${escapeHtml(editUrl)}" style="display:inline-block;text-decoration:none;color:#334155;">
                        <div style="font-size:31px;line-height:1;color:#F5B942;">&#9998;</div>
                        <div style="margin-top:11px;font-size:15px;line-height:1.35;color:#334155;">Bewerken</div>
                      </a>
                    </td>
                    <td align="center" width="33.33%" style="padding:0 8px;">
                      <a href="${escapeHtml(cancelUrl)}" style="display:inline-block;text-decoration:none;color:#334155;">
                        <div style="font-size:31px;line-height:1;color:#F5B942;">&#8855;</div>
                        <div style="margin-top:11px;font-size:15px;line-height:1.35;color:#334155;">Annuleren</div>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="3" align="center" style="padding-top:34px;">
                      <p style="margin:0;font-size:13px;line-height:1.7;color:#97A1AF;">
                        ${escapeHtml(location)}${restaurantPhone ? ` &middot; ${escapeHtml(restaurantPhone)}` : ""}
                      </p>
                    </td>
                  </tr>
                </table>
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
