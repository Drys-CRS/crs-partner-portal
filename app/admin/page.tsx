import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const admin = await requireAdmin(await headers());
  if (!admin) redirect("/portal");

  return <AdminDashboard adminEmail={admin.email} />;
}
