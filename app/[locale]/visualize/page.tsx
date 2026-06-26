import { useTranslations } from "next-intl";
import VisualizeClient from "./VisualizeClient";

export const metadata = {
  title: "Visualize your setup — gobuildgo",
};

export default function VisualizePage() {
  const t = useTranslations("visualize");

  return (
    <main className="container py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <VisualizeClient />
    </main>
  );
}
