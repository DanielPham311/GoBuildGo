import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { locales, defaultLocale, type Locale } from "./i18n/config";

const PUBLIC_PATHS = ["/signin", "/signup", "/api", "/community", "/welcome"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- i18n: ensure locale cookie is set ---
  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (!localeCookie || !locales.includes(localeCookie as (typeof locales)[number])) {
    const acceptLang = req.headers.get("accept-language");
    let locale: Locale = defaultLocale;
    if (acceptLang) {
      const preferred = acceptLang.split(",")[0].trim().split("-")[0];
      if (locales.includes(preferred as Locale)) {
        locale = preferred as Locale;
      }
    }
    // Set cookie on every response (first visit + persisting preference)
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 31536000 });
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
      url.pathname = "/signin";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin") && token.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
