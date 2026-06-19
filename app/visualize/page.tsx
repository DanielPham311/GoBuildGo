import VisualizeClient from "./VisualizeClient";

export const metadata = {
  title: "Visualize your setup — gobuildgo",
};

export default function VisualizePage() {
  return (
    <main className="container py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Visualize your setup</h1>
        <p className="mt-2 text-muted-foreground">
          Describe what you want — we&apos;ll find matching items and generate your room.
        </p>
      </div>
      <VisualizeClient />
    </main>
  );
}
