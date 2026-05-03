import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string;
  const requested = await requestLocale;
  if (!requested || !routing.locales.includes(requested as never)) {
    locale = routing.defaultLocale;
  } else {
    locale = requested;
  }
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
