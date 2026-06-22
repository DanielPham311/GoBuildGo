import Link from "next/link";
import { ArrowRight, Ruler, Palette, ShoppingBag, Sparkles, Users, Eye } from "lucide-react";

const features = [
  {
    icon: Ruler,
    title: "2D Layout Design",
    description: "Set custom room dimensions. Position desks, chairs, monitors, and decor interactively on our drag-and-drop canvas.",
    color: "blue",
    href: "/planner",
    cta: "Open Planner",
  },
  {
    icon: Palette,
    title: "Style & Color Harmony",
    description: "Get real-time style scores. Our engine evaluates color harmony, theme consistency, space fit, and budget balance.",
    color: "purple",
    href: "/planner",
    cta: "Start Designing",
  },
  {
    icon: ShoppingBag,
    title: "Smart Price Comparison",
    description: "Compare prices across Shopee, Lazada, and Tiki. Buy everything with one click via affiliate links.",
    color: "amber",
    href: "/planner",
    cta: "Browse Components",
  },
  {
    icon: Sparkles,
    title: "AI Room Visualizer",
    description: "Describe your dream room in plain text. Our AI finds matching products and generates a photorealistic visualization.",
    color: "emerald",
    href: "/visualize",
    cta: "Try AI Visualizer",
  },
  {
    icon: Users,
    title: "Community Gallery",
    description: "Browse setups shared by other users. Get inspired, clone any setup, and make it your own.",
    color: "rose",
    href: "/community",
    cta: "Explore Gallery",
  },
  {
    icon: Eye,
    title: "Style Score Breakdown",
    description: "Get detailed analysis across 4 dimensions: color harmony, theme consistency, space utilization, and budget balance.",
    color: "cyan",
    href: "/community",
    cta: "See Examples",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", glow: "group-hover:shadow-blue-500/10" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", glow: "group-hover:shadow-purple-500/10" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", glow: "group-hover:shadow-amber-500/10" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", glow: "group-hover:shadow-emerald-500/10" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", glow: "group-hover:shadow-rose-500/10" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20", glow: "group-hover:shadow-cyan-500/10" },
};

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="absolute top-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[700px] w-[700px] rounded-full bg-blue-500/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md mb-8">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to gobuildgo</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Your Dream Desk Setup{" "}
          <span className="bg-gradient-to-r from-blue-500 via-primary to-indigo-600 bg-clip-text text-transparent">
            Starts Here
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Plan your perfect workspace in 2D, get AI-powered style scores, compare prices across
          Shopee, Lazada & Tiki, and buy everything in one click — all in Vietnamese Dong.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/planner"
            className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
          >
            Start Planning
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/community"
            className="flex items-center gap-2 rounded-xl border bg-background/50 backdrop-blur-md px-8 py-4 text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-muted"
          >
            <Users className="h-5 w-5" />
            Browse Community
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className={`group relative overflow-hidden rounded-2xl border ${colors.border} bg-card/50 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:shadow-xl ${colors.glow} hover:translate-y-[-4px]`}
              >
                {/* Icon */}
                <div className={`mb-4 inline-flex rounded-xl ${colors.bg} p-3 ${colors.text} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {feature.description}
                </p>

                {/* CTA */}
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${colors.text} group-hover:gap-2.5 transition-all`}>
                  {feature.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Start Steps */}
      <section className="relative z-10 border-t bg-muted/20">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight mb-12">Get Started in 3 Steps</h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Choose Your Room", desc: "Pick a room type and set your dimensions." },
              { step: "2", title: "Add Components", desc: "Browse desks, chairs, lighting, and more." },
              { step: "3", title: "Share & Buy", desc: "Get your style score and shop with one click." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02]"
            >
              Open Planner
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
