import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST ?? "smtp.transip.email";
const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "hello@xinchao.nl";

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
}) {
  if (!smtpUser || !smtpPass) {
    console.warn("[EMAIL] No SMTP_USER or SMTP_PASS configured; skipping email");
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Xin Ch\u00e0o" <${emailFrom}>`,
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
    console.log("[EMAIL] Sent:", info.messageId);
  } catch (err: any) {
    console.error("[EMAIL] Failed to send:", err.message);
    throw err;
  }
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
  const itemList = items.map(i => `${i.qty}x ${i.name}`).join("\n");
  const body = `Hi ${customerName},

Your order has been received. Please complete payment using the link below.
Order ID: ${orderId}
Total: €${total.toFixed(2).replace(".", ",")}
Location: ${location}
Pickup: ${pickupDate} at ${pickupTime}

Items:
${itemList}

Payment link:
${paymentUrl}

Thank you for ordering!
Xin Chào Vietnamese Restaurant
`;
  await sendEmail({ to, subject: `Order Received — ${orderId}`, text: body });
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
  const itemList = items.map(i => `${i.qty}x ${i.name}`).join("\n");
  const body = `Hi ${customerName},

Payment confirmed!
Order ID: ${orderId}
Total: €${total.toFixed(2).replace(".", ",")}
Location: ${location}
Pickup: ${pickupDate} at ${pickupTime}

Items:
${itemList}

Your food will be ready at the pickup time.

Thank you!
Xin Chào Vietnamese Restaurant
`;
  await sendEmail({ to, subject: `Payment Confirmed — ${orderId}`, text: body });
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
  const body = `Hi ${customerName},

Your reservation is confirmed.

Details:
Date: ${date}
Time: ${time}
Party Size: ${partySize}
Location: ${location}

If you need to make changes, call us at ${restaurantPhone}.

Looking forward to seeing you!
Xin Chào Vietnamese Restaurant
`;
  await sendEmail({ to, subject: `Reservation Confirmed — ${date} at ${time}`, text: body });
}
