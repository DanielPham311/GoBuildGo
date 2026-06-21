import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if ((user as { role?: string }).role !== "admin") redirect("/");

  return <div className="container py-8">{children}</div>;
}
