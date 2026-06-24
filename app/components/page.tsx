import Link from "next/link";
import { prisma } from "@/shared/db";
import { formatCurrency } from "@/lib/utils";
import { ComponentCategory } from "@prisma/client";

export const metadata = {
  title: "Components — gobuildgo",
  description: "Browse desk setup components and compare prices across shops.",
};

export const dynamic = "force-dynamic";

const CATEGORIES: { value: ComponentCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "desk", label: "Desks" },
  { value: "chair", label: "Chairs" },
  { value: "monitor", label: "Monitors" },
  { value: "keyboard", label: "Keyboards" },
  { value: "mouse", label: "Mice" },
  { value: "lighting", label: "Lighting" },
  { value: "decor", label: "Decor" },
  { value: "audio", label: "Audio" },
  { value: "accessory", label: "Accessories" },
];

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
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
          <h1 className="text-3xl font-bold tracking-tight">Components</h1>
          <p className="mt-2 text-muted-foreground">
            Browse {total} components. Compare prices and track history.
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
                {c.label}
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
                    No image
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
            No components found.
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/components?page=${page - 1}${category ? `&category=${category}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/components?page=${page + 1}${category ? `&category=${category}` : ""}`}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
