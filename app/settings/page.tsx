import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { RunPanel } from "@/components/RunPanel";
import { SettingsForm } from "@/components/SettingsForm";
import { isAdmin } from "@/lib/admin";
import { getSettings, recentRuns } from "@/lib/repo";
import { logout } from "./actions";

async function SettingsContent() {
  if (!(await isAdmin())) return <LoginForm />;
  const [settings, runs] = await Promise.all([getSettings(), recentRuns(5)]);
  return (
    <div className="space-y-10">
      <RunPanel
        recipients={settings.recipients}
        recent={runs.map((r) => ({
          id: r.id, trigger: r.trigger, status: r.status, message: r.message,
          startedAt: r.startedAt.toISOString(), digestId: r.digestId,
        }))}
      />
      <SettingsForm initial={settings} />
      <form action={logout}>
        <button className="text-sm text-muted underline underline-offset-2 hover:text-ink">Sign out</button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-muted">Focus sectors, geographies and who receives the Monday email. Changes apply from the next run.</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-line" />}>
          <SettingsContent />
        </Suspense>
      </div>
    </div>
  );
}
