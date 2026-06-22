import Link from "next/link";
import { listPublicSetups } from "@/modules/setups";
import { listSetupsQuerySchema } from "@/modules/setups/schema";
import { formatCurrency } from "@/lib/utils";
import { Eye } from "lucide-react";

export const metadata = {
  title: "Community Gallery — gobuildgo",
  description: "Browse desk setups shared by the gobuildgo community.",
};

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const sp = searchParams;
  const parsed = listSetupsQuerySchema.safeParse({
    page: sp.page,
    limit: sp.limit,
    roomType: sp.roomType ?? undefined,
    theme: sp.theme ?? undefined,
    sort: sp.sort ?? undefined,
  });

  const query = parsed.success ? parsed.data : { page: 1, limit: 20, sort: "newest" as const };
  const { items, total } = await listPublicSetups(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight">Community Gallery</h1>
          <p className="mt-2 text-muted-foreground">
            Browse {total} desk setups shared by the community. Get inspired and make it yours.
          </p>
        </div>
      </section>

      {/* Filters Bar */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <Link
              href={`/community?${new URLSearchParams({ ...sp, sort: "newest" }).toString()}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                query.sort === "newest"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/community?${new URLSearchParams({ ...sp, sort: "popular" }).toString()}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                query.sort === "popular"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Most Popular
            </Link>

            <div className="mx-2 h-4 w-px bg-border" />

            {/* Room Type Filters */}
            {(["bedroom", "gaming_room", "office", "studio"] as const).map((rt) => (
              <Link
                key={rt}
                href={`/community?${new URLSearchParams({ ...sp, roomType: rt }).toString()}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  query.roomType === rt
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {rt.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>
            ))}

            {/* Clear filters */}
            {(query.roomType || query.theme || query.sort !== "newest") && (
              <Link
                href="/community"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Clear
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">No public setups yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to share your setup!
            </p>
            <Link
              href="/planner"
              className="mt-4 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Create a Setup
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((setup) => (
              <Link
                key={setup.id}
                href={`/setups/${setup.id}`}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]"
              >
                {/* Cover Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {setup.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={setup.coverImageUrl}
                      alt={setup.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <span className="text-4xl">🖥️</span>
                    </div>
                  )}

                  {/* Theme Badge */}
                  {setup.theme && (
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {setup.theme}
                    </span>
                  )}

                  {/* Room Type Badge */}
                  {setup.roomType && (
                    <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {setup.roomType.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                    {setup.name}
                  </h3>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {setup.totalPrice ? formatCurrency(setup.totalPrice) : "—"}
                    </span>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {setup.viewCount}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {query.page > 1 && (
              <Link
                href={`/community?${new URLSearchParams({ ...sp, page: String(query.page - 1) }).toString()}`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Previous
              </Link>
            )}

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, query.page - 2)) + i;
              if (pageNum > totalPages) return null;
              return (
                <Link
                  key={pageNum}
                  href={`/community?${new URLSearchParams({ ...sp, page: String(pageNum) }).toString()}`}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    pageNum === query.page
                      ? "bg-primary text-primary-foreground"
                      : "border hover:bg-muted"
                  }`}
                >
                  {pageNum}
                </Link>
              );
            })}

            {query.page < totalPages && (
              <Link
                href={`/community?${new URLSearchParams({ ...sp, page: String(query.page + 1) }).toString()}`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
