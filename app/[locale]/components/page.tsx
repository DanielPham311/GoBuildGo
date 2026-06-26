import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/shared/db";
import { formatCurrency } from "@/lib/utils";
import { ComponentCategory } from "@prisma/client";

export const metadata = {
  title: "Components — gobuildgo",
  description: "Browse desk setup components and compare prices across shops.",
};

export const dynamic = "force-dynamic";

const CATEGORIES: { value: ComponentCategory | ""; labelKey: string }[] = [
  { value: "", labelKey: "all" },
  { value: "desk", labelKey: "desks" },
  { value: "chair", labelKey: "chairs" },
  { value: "monitor", labelKey: "monitors" },
  { value: "keyboard", labelKey: "keyboards" },
  { value: "mouse", labelKey: "mice" },
  { value: "lighting", labelKey: "lighting" },
  { value: "decor", labelKey: "decor" },
  { value: "audio", labelKey: "audio" },
  { value: "accessory", labelKey: "accessories" },
];

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const t = await getTranslations("components");
  const sp = searchParams;
  const category = (sp.category as ComponentCategory) || "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = 24;

  const where = category ? { category, isActive: true } : { isActive: true };

  const [components, total] = await Promise.all([
    prisma.component.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        prices: { orderBy: { price: "asc" }, take: 1 },
      },
    }),
    prisma.component.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("browseCount", { count: total })}
          </p>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={c.value ? `/components?category=${c.value}` : "/components"}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === c.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t(c.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {components.map((c) => (
            <Link
              key={c.id}
              href={`/components/${c.id}`}
              className="group rounded-xl border bg-card transition-shadow hover:shadow-md"
            >
              <div className="aspect-video overflow-hidden rounded-t-xl bg-muted">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    {t("noImage")}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-muted-foreground">{c.brand}</p>
                <h3 className="mt-0.5 font-semibold leading-tight">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.category}</p>
                {c.prices[0] && (
                  <p className="mt-2 text-lg font-bold text-primary">
                    {formatCurrency(Number(c.prices[0].price))}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {components.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            {t("noComponents")}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/components?page=${page - 1}${category ? `&category=${category}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                {t("common:previous")}
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              {t("pageOf", { page, totalPages })}
            </span>
            {page < totalPages && (
              <Link
                href={`/components?page=${page + 1}${category ? `&category=${category}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                {t("common:next")}
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
