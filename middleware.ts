import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { locales, defaultLocale, type Locale } from "./i18n/config";

const PUBLIC_PATHS = ["/signin", "/signup", "/api", "/community", "/welcome"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  // Strip locale prefix for checking
  const withoutLocale = pathname.replace(/^\/(en|vi)/, "") || "/";
  return PUBLIC_PATHS.some((p) => withoutLocale.startsWith(p));
}

function getPathnameLocale(pathname: string): Locale | null {
  const firstSegment = pathname.split("/")[1];
  return locales.includes(firstSegment as Locale) ? (firstSegment as Locale) : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- i18n: redirect to locale-prefixed path if missing ---
  const pathnameLocale = getPathnameLocale(pathname);
  if (!pathnameLocale) {
    const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
    let locale: Locale = defaultLocale;
    if (localeCookie && locales.includes(localeCookie as Locale)) {
      locale = localeCookie as Locale;
    } else {
      const acceptLang = req.headers.get("accept-language");
      if (acceptLang) {
        const preferred = acceptLang.split(",")[0].trim().split("-")[0];
        if (locales.includes(preferred as Locale)) {
          locale = preferred as Locale;
        }
      }
    }
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000 });
    return response;
  }

  // Set cookie if not already set (for direct visits to /vi or /en)
  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (!localeCookie) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", pathnameLocale, { path: "/", maxAge: 31536000 });
    return response;
  }

  // --- API versioning redirect ---
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/v")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/v1${pathname.slice(4)}`;
    return NextResponse.redirect(url, 307);
  }

  // --- Auth: non-public pages require authentication ---
  if (!isPublic(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = `/${pathnameLocale}/signin`;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && token.role !== "admin") {
      return NextResponse.redirect(new URL(`/${pathnameLocale}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
