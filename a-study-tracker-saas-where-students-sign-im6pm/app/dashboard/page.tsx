import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/session";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <DashboardClient email={user.email} />;
}
