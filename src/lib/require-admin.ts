import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function requireAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}
