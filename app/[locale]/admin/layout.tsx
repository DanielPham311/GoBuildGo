import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth";
import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if ((user as { role?: string }).role !== "admin") redirect("/");

  return (
    <div className="container py-8">
      <AdminNav />
      {children}
    </div>
  );
}
