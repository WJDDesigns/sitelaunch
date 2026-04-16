import { requireSuperadmin } from "@/lib/auth";
import { getSecurityOverview, getActiveSessionsAction } from "./actions";
import SecurityDashboard from "./SecurityDashboard";

export default async function SecurityPage() {
  await requireSuperadmin();

  const [overview, sessions] = await Promise.all([
    getSecurityOverview(),
    getActiveSessionsAction(),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          <i className="fa-solid fa-shield-halved text-primary mr-3" />
          Security
        </h1>
        <p className="text-on-surface-variant mt-1">
          Monitor authentication, MFA adoption, active sessions, and platform security posture.
        </p>
      </header>

      <SecurityDashboard overview={overview} sessions={sessions} />
    </div>
  );
}
