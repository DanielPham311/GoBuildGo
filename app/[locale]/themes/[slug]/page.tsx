import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getThemeBySlug, toPublicTheme } from "@/modules/themes";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ThemeDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const t = await getTranslations("themes");
  const theme = await getThemeBySlug(params.slug);
  if (!theme) notFound();

  const themeData = toPublicTheme(theme);
  const components = theme.components.map((tc) => tc.component);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/themes"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToThemes")}
          </Link>

          <div className="flex items-start gap-4">
            <div className="hidden sm:block h-24 w-24 shrink-0 rounded-xl overflow-hidden border">
              {themeData.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={themeData.coverImageUrl} alt={themeData.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: themeData.colorPalette.length
                      ? `linear-gradient(135deg, ${themeData.colorPalette.slice(0, 3).join(", ")})`
                      : "linear-gradient(135deg, #1e293b, #334155)",
                  }}
                />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{themeData.name}</h1>
                {themeData.isFeatured && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                    <Check className="h-3 w-3" />
                    {t("featured")}
                  </span>
                )}
              </div>
              {themeData.description && (
                <p className="mt-2 text-muted-foreground max-w-2xl">{themeData.description}</p>
              )}

              {themeData.colorPalette.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("colorPalette")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {themeData.colorPalette.map((color, i) => (
                      <span
                        key={i}
                        className="h-6 w-6 rounded-full border border-border/50 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {themeData.styleTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {themeData.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-xl font-bold mb-6">{t("recommendedComponents")}</h2>

        {components.length === 0 ? (
          <p className="text-muted-foreground">{t("noComponents")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((comp) => (
              <Link
                key={comp.id}
                href={`/components/${comp.id}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px]"
              >
                <div className="h-16 w-16 shrink-0 rounded-lg bg-muted overflow-hidden">
                  {comp.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comp.imageUrl}
                      alt={comp.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-50">
                      🖥️
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{comp.brand} &middot; {comp.category}</p>
                  {comp.prices && comp.prices.length > 0 && (
                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(Number(comp.prices[0].price))}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">
          <h2 className="text-xl font-bold mb-2">{t("useThemeInPlanner")}</h2>
          <p className="text-muted-foreground mb-6">
            {t("useThemeInPlannerDesc")}
          </p>
          <Link
            href={`/planner?theme=${encodeURIComponent(themeData.name)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          >
            {t("startWithName", { name: themeData.name })}
          </Link>
        </div>
      </section>
    </main>
  );
}
