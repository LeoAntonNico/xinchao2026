import os

base = "/Users/openmac/restaurant"

# Create messages directory and files
os.makedirs(f"{base}/messages", exist_ok=True)

en = {
  "nav": {
    "home": "Home",
    "about": "About Us",
    "menu": "Menu",
    "order": "Order",
    "reserve": "Reserve"
  },
  "home": {
    "welcome": "Welcome to Vietnamese Restaurant Xin Chao",
    "orderOnline": "Order Online",
    "reserveTable": "Reserve Table",
    "openingHours": "Opening Hours"
  },
  "days": {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday"
  },
  "order": {
    "payWithMollie": "Pay with Mollie",
    "addToCart": "Add to cart",
    "selectLocation": "Select location",
    "selectPickupTime": "Select pickup time",
    "checkout": "Checkout",
    "yourName": "Your name",
    "phone": "Phone number",
    "email": "Email (optional)",
    "notes": "Notes",
    "confirm": "Confirm order"
  },
  "reservation": {
    "selectDate": "Select date",
    "selectTime": "Select time",
    "partySize": "Number of guests",
    "book": "Book table"
  },
  "common": {
    "loading": "Loading...",
    "submit": "Submit",
    "cancel": "Cancel",
    "close": "Close"
  }
}

nl = {
  "nav": {
    "home": "Home",
    "about": "Over Ons",
    "menu": "Menu",
    "order": "Bestellen",
    "reserve": "Reserveren"
  },
  "home": {
    "welcome": "Welkom bij Vietnamees Restaurant Xin Chao",
    "orderOnline": "Online Bestellen",
    "reserveTable": "Tafel Reserveren",
    "openingHours": "Openingstijden"
  },
  "days": {
    "monday": "Maandag",
    "tuesday": "Dinsdag",
    "wednesday": "Woensdag",
    "thursday": "Donderdag",
    "friday": "Vrijdag",
    "saturday": "Zaterdag",
    "sunday": "Zondag"
  },
  "order": {
    "payWithMollie": "Betaal met Mollie",
    "addToCart": "Toevoegen",
    "selectLocation": "Kies vestiging",
    "selectPickupTime": "Kies tijd",
    "checkout": "Afrekenen",
    "yourName": "Uw naam",
    "phone": "Telefoonnummer",
    "email": "E-mail (optioneel)",
    "notes": "Opmerkingen",
    "confirm": "Bestelling bevestigen"
  },
  "reservation": {
    "selectDate": "Kies datum",
    "selectTime": "Kies tijd",
    "partySize": "Aantal personen",
    "book": "Reserveren"
  },
  "common": {
    "loading": "Laden...",
    "submit": "Versturen",
    "cancel": "Annuleren",
    "close": "Sluiten"
  }
}

# Write JSON
import json

with open(f"{base}/messages/en.json", "w") as f:
    json.dump(en, f, indent=2)
with open(f"{base}/messages/nl.json", "w") as f:
    json.dump(nl, f, indent=2)

# Write i18n routing.ts
routing_ts = """import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'nl'],
  defaultLocale: 'en',
  localePrefix: 'always'
});
"""
with open(f"{base}/src/i18n/routing.ts", "w") as f:
    f.write(routing_ts.strip())

# Write middleware.ts
middleware_ts = """import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
"""
with open(f"{base}/middleware.ts", "w") as f:
    f.write(middleware_ts.strip())

# Write next.config.ts with createNextIntlPlugin
next_config = """import { createNextIntlPlugin } from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/config.ts');

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
"""
with open(f"{base}/next.config.ts", "w") as f:
    f.write(next_config.strip())

# Write src/i18n/config.ts
config_ts = """import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
"""
with open(f"{base}/src/i18n/config.ts", "w") as f:
    f.write(config_ts.strip())

print("done")
