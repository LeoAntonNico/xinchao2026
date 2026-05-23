import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret() {
  return process.env.NEXTAUTH_SECRET || "local-preview-secret";
}

export function createReservationEditToken(reservationId: string) {
  return createHmac("sha256", signingSecret())
    .update(`reservation-edit:${reservationId}`)
    .digest("base64url");
}

export function verifyReservationEditToken(reservationId: string, token: string) {
  const expected = Buffer.from(createReservationEditToken(reservationId));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
