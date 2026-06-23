import Link from "next/link";
import { listThemes, toPublicTheme } from "@/modules/themes";
import { listThemesQuerySchema } from "@/modules/themes/schema";
import { Check } from "lucide-react";

export const metadata = {
  title: "Theme Gallery — gobuildgo",
  description: "Browse curated desk setup themes to inspire your next workspace.",
};

export const dynamic = "force-dynamic";

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const sp = searchParams;
  const parsed = listThemesQuerySchema.safeParse({
    page: sp.page,
    limit: sp.limit,
    featured: sp.featured === "true" ? true : sp.featured === "false" ? false : undefined,
  });

  const query = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const { items, total } = await listThemes(query);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight">Theme Gallery</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a curated theme to inspire your next setup.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/themes"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                query.featured === undefined
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </Link>
            <Link
              href="/themes?featured=true"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                query.featured === true
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Featured
            </Link>
            {query.featured !== undefined && (
              <Link
                href="/themes"
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
            <p className="text-lg font-medium text-muted-foreground">No themes found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((theme) => {
              const t = toPublicTheme(theme);
              return (
                <Link
                  key={t.id}
                  href={`/themes/${t.slug}`}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]"
                >
                  {/* Cover / Palette Preview */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {t.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.coverImageUrl}
                        alt={t.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background: t.colorPalette.length
                            ? `linear-gradient(135deg, ${t.colorPalette.slice(0, 3).join(", ")})`
                            : "linear-gradient(135deg, #1e293b, #334155)",
                        }}
                      >
                        <span className="text-4xl opacity-50">🎨</span>
                      </div>
                    )}

                    {t.isFeatured && (
                      <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        <Check className="h-3 w-3" />
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                      {t.name}
                    </h3>
                    {t.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {t.description}
                      </p>
                    )}

                    {/* Color Palette Swatches */}
                    {t.colorPalette.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {t.colorPalette.slice(0, 5).map((color, i) => (
                          <span
                            key={i}
                            className="h-4 w-4 rounded-full border border-border/50"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {t.colorPalette.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{t.colorPalette.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Style Tags */}
                    {t.styleTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.styleTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {query.page > 1 && (
              <Link
                href={`/themes?${new URLSearchParams({ ...sp, page: String(query.page - 1) }).toString()}`}
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
                  href={`/themes?${new URLSearchParams({ ...sp, page: String(pageNum) }).toString()}`}
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
                href={`/themes?${new URLSearchParams({ ...sp, page: String(query.page + 1) }).toString()}`}
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
