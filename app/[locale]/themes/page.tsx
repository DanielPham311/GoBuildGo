import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("themes");
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
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </section>

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
              {t("all")}
            </Link>
            <Link
              href="/themes?featured=true"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                query.featured === true
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t("featured")}
            </Link>
            {query.featured !== undefined && (
              <Link
                href="/themes"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                {t("clearFilters")}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">{t("noThemes")}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((theme) => {
              const themeData = toPublicTheme(theme);
              return (
                <Link
                  key={themeData.id}
                  href={`/themes/${themeData.slug}`}
                  className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {themeData.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={themeData.coverImageUrl}
                        alt={themeData.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center"
                        style={{
                          background: themeData.colorPalette.length
                            ? `linear-gradient(135deg, ${themeData.colorPalette.slice(0, 3).join(", ")})`
                            : "linear-gradient(135deg, #1e293b, #334155)",
                        }}
                      >
                        <span className="text-4xl opacity-50">🎨</span>
                      </div>
                    )}

                    {themeData.isFeatured && (
                      <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        <Check className="h-3 w-3" />
                        {t("featured")}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                      {themeData.name}
                    </h3>
                    {themeData.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {themeData.description}
                      </p>
                    )}

                    {themeData.colorPalette.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5">
                        {themeData.colorPalette.slice(0, 5).map((color, i) => (
                          <span
                            key={i}
                            className="h-4 w-4 rounded-full border border-border/50"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        {themeData.colorPalette.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{themeData.colorPalette.length - 5}
                          </span>
                        )}
                      </div>
                    )}

                    {themeData.styleTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {themeData.styleTags.slice(0, 3).map((tag) => (
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

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {query.page > 1 && (
              <Link
                href={`/themes?${new URLSearchParams({ ...sp, page: String(query.page - 1) }).toString()}`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {t("common:previous")}
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
                {t("common:next")}
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
