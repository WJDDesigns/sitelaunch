import { getSession } from "@/lib/auth";
import DocsClient from "./DocsClient";

export const metadata = {
  title: "Documentation | linqme",
  description: "Everything you need to know about building forms, managing clients, and growing your agency with linqme.",
};

export default async function DocsPage() {
  const session = await getSession();
  const isLoggedIn = !!session;
  return <DocsClient isLoggedIn={isLoggedIn} />;
}
