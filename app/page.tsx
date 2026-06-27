import Link from "next/link";
import { ArrowRight, Sparkles, Layout, ShoppingBag, Palette, Ruler } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative floating blurred background shapes */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] h-[350px] w-[350px] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="container relative z-10 mx-auto px-6 pt-24 pb-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-md animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>Interactive Setup Planner for Everyone</span>
          </div>

          {/* Main Hero Header */}
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
            Build Your Dream <br />
            <span className="bg-gradient-to-r from-blue-500 via-primary to-indigo-600 bg-clip-text text-transparent">
              Desk Workspace
            </span>
          </h1>

          {/* Subtext */}
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Plan your layout in 2D, balance your budget in VND, optimize color harmony, and shop the cheapest deals across Shopee, Lazada, and Tiki.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/planner"
              className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
            >
              Start Planning
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/visualize"
              className="flex items-center gap-2 rounded-xl border bg-background/50 backdrop-blur-md px-8 py-4 text-base font-semibold text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-muted"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              Try AI Visualizer
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-12 relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border bg-card/40 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-4px]">
              <div className="mb-4 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-500 group-hover:scale-110 transition-transform">
                <Ruler className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">2D Layout Design</h3>
              <p className="text-sm text-muted-foreground">
                Set custom room dimensions. Position desks, chairs, monitors, and decor interactively on our drag-and-drop canvas.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border bg-card/40 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-4px]">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary group-hover:scale-110 transition-transform">
                <Palette className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Style &amp; Color Harmony</h3>
              <p className="text-sm text-muted-foreground">
                Get real-time style scores. Let our engine evaluate how consistent your setup is with Minimalist, RGB, or wood aesthetics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border bg-card/40 backdrop-blur-md p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-4px]">
              <div className="mb-4 inline-flex rounded-xl bg-amber-500/10 p-3 text-amber-500 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Smart Price Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Compare actual listings in Vietnam. Save money with auto-updates and affiliate deals mapped directly to your parts list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Styled Preset Themes Preview */}
      <section className="container mx-auto px-6 py-16 relative z-10 border-t bg-muted/20">
        <div className="mx-auto max-w-5xl text-center space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Curated Themes for Inspiration</h2>
            <p className="text-muted-foreground">Select a theme to auto-fill your planner layout instantly.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-left">
            {[
              {
                title: "Japandi Cozy",
                colors: ["#F5F5DC", "#D2B48C", "#8B7355", "#EAE6DF", "#3E3B39"],
                count: 14,
              },
              {
                title: "RGB Cyberpunk",
                colors: ["#FF007F", "#00F0FF", "#181825", "#7000FF", "#0A0A10"],
                count: 18,
              },
              {
                title: "Industrial Studio",
                colors: ["#2C302E", "#8B8C89", "#D2691E", "#3A3D40", "#141517"],
                count: 11,
              },
              {
                title: "Monochrome Pro",
                colors: ["#FFFFFF", "#F5F5F7", "#8E8E93", "#1C1C1E", "#000000"],
                count: 15,
              },
            ].map((theme, i) => (
              <div
                key={i}
                className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <h3 className="font-bold text-base group-hover:text-primary transition-colors">
                  {theme.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 h-8">Use Theme</p>
                <div className="flex gap-1.5 mb-4">
                  {theme.colors.map((c, idx) => (
                    <div
                      key={idx}
                      className="h-4 w-4 rounded-full border border-border/50"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-muted-foreground">{theme.count} View All</span>
                  <Link
                    href="/planner"
                    className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1"
                  >
                    Use Theme →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
