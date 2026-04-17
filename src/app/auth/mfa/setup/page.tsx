import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import MfaSetupFlow from "./MfaSetupFlow";
import VantaBackground from "@/components/VantaBackground";
import AuthHeader from "@/components/AuthHeader";

interface Props {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaSetupPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { next } = await searchParams;
  const redirectTo = next || "/dashboard";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 pt-16 pb-8 relative overflow-hidden bg-surface">
      <VantaBackground />
      <AuthHeader />

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <MfaSetupFlow redirectTo={redirectTo} userEmail={session.email} />
      </div>
    </main>
  );
}
