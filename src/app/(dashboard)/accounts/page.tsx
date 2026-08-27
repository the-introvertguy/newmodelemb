import React from "react";
import { getUnifiedAccounts } from "@/actions/accounts";
import { prisma } from "@/lib/prisma";
import { AccountsViewClient } from "@/components/accounts/accounts-view-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [unifiedData, categories] = await Promise.all([
    getUnifiedAccounts({ page: 1, pageSize: 100 }),
    prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AccountsViewClient
        summary={unifiedData.stats}
        initialExpenses={unifiedData.expenses}
        initialPayments={unifiedData.payments}
        categories={categories}
      />
    </div>
  );
}
