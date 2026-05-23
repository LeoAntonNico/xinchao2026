export function orderNumberPrefix(locationSlug: string) {
  if (locationSlug === "utrecht") return "UTR";
  if (locationSlug === "wageningen") return "WAG";
  return locationSlug.slice(0, 3).toUpperCase();
}

export function visibleOrderNumber(order: { id: string; orderNumber?: string | null }) {
  return order.orderNumber || order.id.slice(-8).toUpperCase();
}
