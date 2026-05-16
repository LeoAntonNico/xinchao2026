// Analytics tracking utility — wire to real provider when ready
// TODO: Replace console.log with actual analytics SDK (GA4, Plausible, etc.)

export type AnalyticsEvent =
  | "location_selected"
  | "order_clicked"
  | "reserve_clicked"
  | "call_clicked"
  | "directions_clicked"
  | "cart_opened"
  | "dish_added"
  | "reservation_started"
  | "reservation_completed"
  | "reservation_abandoned"
  | "menu_viewed"
  | "opening_hours_expanded"
  | "footer_link_clicked"
  | "hero_cta_clicked"
  | "sticky_cta_clicked";

interface EventPayload {
  event: AnalyticsEvent;
  locationId?: string;
  locationName?: string;
  dishId?: string;
  dishName?: string;
  path?: string;
  locale?: string;
  [key: string]: string | number | boolean | undefined;
}

export function track(payload: EventPayload) {
  // Placeholder — replace with real analytics
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[Analytics]", payload);
  }

  // TODO: Integration point — uncomment when analytics provider is configured
  // gtag("event", payload.event, { ...payload });
  // plausible(payload.event, { props: { ...payload } });
}
