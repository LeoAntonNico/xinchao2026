import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_xxxxxxxx");

async function sendEmail(args: {
  to: string | string[];
  subject: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] No RESEND_API_KEY configured; skipping email");
    return;
  }
  const from = process.env.EMAIL_FROM ?? "noreply@xinchao-restaurant.nl";
  await resend.emails.send({ from, ...args });
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
Total: E$ {total.toFixed(2).replace(".", ",")}
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
Total: E$ {total.toFixed(2).replace(".", ",")}
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
