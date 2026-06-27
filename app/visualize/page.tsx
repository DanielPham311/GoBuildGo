import VisualizeClient from "./VisualizeClient";

export const metadata = {
  title: "Visualize your setup — gobuildgo",
};

export default function VisualizePage() {
  return (
    <main className="container py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">AI Room Visualizer</h1>
        <p className="mt-2 text-muted-foreground">
          Describe a room and let AI generate a visualization of your setup.
        </p>
      </div>
      <VisualizeClient />
    </main>
  );
}
