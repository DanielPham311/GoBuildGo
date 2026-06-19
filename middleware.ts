import { NextResponse, type NextRequest } from "next/server";

// Redirect unversioned API requests to the current version. Reference: API_DESIGN.md §2.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/v")) {
    const url = req.nextUrl.clone();
    url.pathname = `/api/v1${pathname.slice(4)}`;
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
