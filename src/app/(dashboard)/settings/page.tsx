import React from "react";
import { getCompanySettings, getAuditLogs } from "@/actions/settings";
import { SettingsViewClient } from "@/components/settings/settings-view-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, auditData] = await Promise.all([
    getCompanySettings(),
    getAuditLogs(1, 30),
  ]);

  return (
    <div className="space-y-6">
      <SettingsViewClient settings={settings} auditLogs={auditData.logs} />
    </div>
  );
}
