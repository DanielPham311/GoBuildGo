"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Laptop, Sparkles, LogOut, User as UserIcon, Users, Palette, LayoutDashboard, Monitor } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as { name?: string | null; email?: string | null; role?: string } | undefined;
  const isAdmin = user?.role === "admin";
  const pathname = usePathname();

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
              Go Build Go
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/components" className={linkClass("/components")}>
              <span className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Components
              </span>
            </Link>
            <Link href="/community" className={linkClass("/community")}>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Community
              </span>
            </Link>
            <Link href="/themes" className={linkClass("/themes")}>
              <span className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Themes
              </span>
            </Link>
            {status === "authenticated" && (
              <>
                <Link href="/visualize" className={linkClass("/visualize")}>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Visualize
                  </span>
                </Link>
                <Link href="/planner" className={linkClass("/planner")}>
                  Planner
                </Link>
                <Link href="/dashboard" className={linkClass("/dashboard")}>
                  <span className="flex items-center gap-1.5">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </span>
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={linkClass("/admin")}>
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side: user */}
        <div className="flex items-center gap-4">
          {status === "loading" && (
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          )}

          {status === "unauthenticated" && (
            <div className="flex items-center gap-3">
              <Link href="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Log in
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
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{user.name ?? user.email}</span>
                {isAdmin && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    admin
                  </span>
                )}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
