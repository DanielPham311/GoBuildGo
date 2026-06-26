import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Ruler, Palette, ShoppingBag, Sparkles, Users, Eye } from "lucide-react";

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", glow: "group-hover:shadow-blue-500/10" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", glow: "group-hover:shadow-purple-500/10" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", glow: "group-hover:shadow-amber-500/10" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", glow: "group-hover:shadow-emerald-500/10" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", glow: "group-hover:shadow-rose-500/10" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20", glow: "group-hover:shadow-cyan-500/10" },
};

export default function WelcomePage() {
  const t = useTranslations("welcome");

  const features = [
    { icon: Ruler, color: "blue", href: "/planner", titleKey: "featureLayout", descKey: "featureLayoutDesc", ctaKey: "openPlanner" },
    { icon: Palette, color: "purple", href: "/planner", titleKey: "featureStyle", descKey: "featureStyleDesc", ctaKey: "startDesigning" },
    { icon: ShoppingBag, color: "amber", href: "/planner", titleKey: "featurePrice", descKey: "featurePriceDesc", ctaKey: "browseComponents" },
    { icon: Sparkles, color: "emerald", href: "/visualize", titleKey: "featureVisualize", descKey: "featureVisualizeDesc", ctaKey: "tryVisualizer" },
    { icon: Users, color: "rose", href: "/community", titleKey: "featureCommunity", descKey: "featureCommunityDesc", ctaKey: "exploreGallery" },
    { icon: Eye, color: "cyan", href: "/community", titleKey: "featureScore", descKey: "featureScoreDesc", ctaKey: "seeExamples" },
  ];

  const steps = [
    { step: "1", titleKey: "step1Title", descKey: "step1Desc" },
    { step: "2", titleKey: "step2Title", descKey: "step2Desc" },
    { step: "3", titleKey: "step3Title", descKey: "step3Desc" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute top-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[700px] w-[700px] rounded-full bg-blue-500/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md mb-8">
          <Sparkles className="h-4 w-4" />
          <span>{t("welcomeBadge")}</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          {t("heroTitle")}{" "}
          <span className="bg-gradient-to-r from-blue-500 via-primary to-indigo-600 bg-clip-text text-transparent">
            {t("heroHighlight")}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t("heroSubtext")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/planner"
            className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
          >
            {t("startPlanning")}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/community"
            className="flex items-center gap-2 rounded-xl border bg-background/50 backdrop-blur-md px-8 py-4 text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-muted"
          >
            <Users className="h-5 w-5" />
            {t("browseCommunity")}
          </Link>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;
            return (
              <Link
                key={feature.titleKey}
                href={feature.href}
                className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-card/50 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${colors.glow} hover:translate-y-[-4px]`}
              >
                <div className={`mb-4 inline-flex rounded-xl ${colors.bg} p-3 ${colors.text} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {t(feature.descKey)}
                </p>

                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${colors.text} group-hover:gap-2.5 transition-all`}>
                  {t(feature.ctaKey)}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight mb-12">{t("getStartedSteps")}</h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="font-semibold text-base mb-1">{t(item.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02]"
            >
              {t("openPlanner")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
