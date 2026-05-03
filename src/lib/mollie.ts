import createMollieClient, { MollieClient } from "@mollie/api-client";

function getMollieClient(): MollieClient {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error("MOLLIE_API_KEY is not set");
  }
  return createMollieClient({ apiKey });
}

export async function createPayment(
  amount: number,
  orderId: string,
  redirectUrl: string
) {
  const mollie = getMollieClient();
  return mollie.payments.create({
    amount: {
      currency: "EUR",
      value: (amount / 100).toFixed(2),
    },
    description: `Order ${orderId}`,
    redirectUrl,
    webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhook/mollie`,
    metadata: { orderId },
  });
}

export async function getPayment(paymentId: string) {
  const mollie = getMollieClient();
  return mollie.payments.get(paymentId);
}

export { getMollieClient };
