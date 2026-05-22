import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

function preferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (routing.locales.includes(cookieLocale as never)) {
    return cookieLocale;
  }

  const acceptedLanguage = request.headers.get('accept-language')?.toLowerCase() ?? '';
  if (acceptedLanguage.includes('nl')) {
    return 'nl';
  }

  return routing.defaultLocale;
}

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasLocalePrefix = routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (!hasLocalePrefix) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.headers.get('host')}`;
    const targetPath = `/${preferredLocale(request)}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(new URL(`${targetPath}${search}`, baseUrl));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\..*).*)']
};
