import createMollieClient, { PaymentCreateParams } from "@mollie/api-client";

const mollieApiKey = process.env["MOLLIE_API_KEY"];

if (!mollieApiKey) {
  throw new Error("MOLLIE_API_KEY is not set in environment");
}

export const mollieClient = createMollieClient({ apiKey: mollieApiKey });

interface CreatePaymentInput {
  amount: number; // in EUR cents
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  method?: string; // e.g. "ideal", "card", "bancontact", etc.
  metadata?: Record<string, unknown>;
}

export async function createPayment(input: CreatePaymentInput) {
  const euros = (input.amount / 100).toFixed(2);

  const params: PaymentCreateParams = {
    amount: {
      currency: "EUR",
      value: euros,
    },
    description: input.description,
    redirectUrl: input.redirectUrl,
    ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
    ...(input.method ? { method: input.method as any } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  return mollieClient.payments.create(params);
}

export async function getPayment(id: string) {
  return mollieClient.payments.get(id);
}

export async function listMethods() {
  return mollieClient.methods.list();
}
