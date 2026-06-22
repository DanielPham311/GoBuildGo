"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Laptop, Sparkles, LogOut, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const isAdmin = user?.role === "admin";

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? "text-primary" : "text-muted-foreground"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand/Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Laptop className="h-4 w-4" />
            </span>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent font-extrabold">
              gobuildgo
            </span>
          </Link>

          {/* Navigation Links */}
          {status === "authenticated" && (
            <div className="hidden items-center gap-6 md:flex">
              <Link href="/visualize" className={linkClass("/visualize")}>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Visualize
                </span>
              </Link>
              <Link href="/planner" className={linkClass("/planner")}>
                Planner
              </Link>
              {isAdmin && (
                <Link href="/admin" className={linkClass("/admin")}>
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>

        {/* User / Auth Info */}
        <div className="flex items-center gap-4">
          {status === "loading" && (
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          )}

          {status === "unauthenticated" && (
            <div className="flex items-center gap-3">
              <Link href="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-300 hover:bg-primary/95 hover:shadow"
              >
                Sign up
              </Link>
            </div>
          )}

          {status === "authenticated" && user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{user.name ?? user.email}</span>
                {isAdmin && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    admin
                  </span>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
