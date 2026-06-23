import Link from "next/link";
import { notFound } from "next/navigation";
import { getThemeBySlug, toPublicTheme } from "@/modules/themes";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Check } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ThemeDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const theme = await getThemeBySlug(params.slug);
  if (!theme) notFound();

  const t = toPublicTheme(theme);
  const components = theme.components.map((tc) => tc.component);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/themes"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Themes
          </Link>

          <div className="flex items-start gap-4">
            {/* Palette / Cover */}
            <div className="hidden sm:block h-24 w-24 shrink-0 rounded-xl overflow-hidden border">
              {t.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.coverImageUrl} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: t.colorPalette.length
                      ? `linear-gradient(135deg, ${t.colorPalette.slice(0, 3).join(", ")})`
                      : "linear-gradient(135deg, #1e293b, #334155)",
                  }}
                />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{t.name}</h1>
                {t.isFeatured && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                    <Check className="h-3 w-3" />
                    Featured
                  </span>
                )}
              </div>
              {t.description && (
                <p className="mt-2 text-muted-foreground max-w-2xl">{t.description}</p>
              )}

              {/* Color Palette */}
              {t.colorPalette.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Palette
                  </span>
                  <div className="flex items-center gap-1.5">
                    {t.colorPalette.map((color, i) => (
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

              {/* Style Tags */}
              {t.styleTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.styleTags.map((tag) => (
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

      {/* Recommended Components */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-xl font-bold mb-6">Recommended Components</h2>

        {components.length === 0 ? (
          <p className="text-muted-foreground">No components listed for this theme yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((comp) => (
              <Link
                key={comp.id}
                href={`/components/${comp.id}`}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px]"
              >
                {/* Thumbnail */}
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

                {/* Info */}
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

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">
          <h2 className="text-xl font-bold mb-2">Use this theme in your planner</h2>
          <p className="text-muted-foreground mb-6">
            Start a new setup with this theme pre-selected.
          </p>
          <Link
            href={`/planner?theme=${encodeURIComponent(t.name)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          >
            Start with {t.name}
          </Link>
        </div>
      </section>
    </main>
  );
}
