import React from "react";
import { getEmployees } from "@/actions/employees";
import { EmployeesViewClient } from "@/components/employees/employees-view-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const data = await getEmployees();

  return (
    <div className="space-y-6">
      <EmployeesViewClient employees={data.employees} />
    </div>
  );
}
