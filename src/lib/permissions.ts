import { Role } from "@prisma/client";

export type AppPermission =
  // Orders
  | "orders:view"
  | "orders:create"
  | "orders:edit"
  | "orders:archive"
  | "orders:delete"
  | "orders:status"
  // Buyers
  | "buyers:view"
  | "buyers:create"
  | "buyers:edit"
  | "buyers:delete"
  // Invoices
  | "invoices:view"
  | "invoices:create"
  | "invoices:edit"
  | "invoices:delete"
  // Accounts & Expenses
  | "accounts:view"
  | "expenses:create"
  | "expenses:edit"
  | "expenses:delete"
  // Payments & Ledger
  | "payments:create"
  | "payments:view"
  | "ledger:view_individual"
  | "ledger:view_overall"
  // Employees & Payroll
  | "employees:view"
  | "employees:manage"
  | "advances:create"
  | "advances:view"
  | "bonuses:create"
  | "payroll:settle"
  | "payroll:view"
  // Reports
  | "reports:view"
  // Users & Administration
  | "users:manage"
  | "settings:manage"
  | "audit:view";

const ROLE_DEFAULT_PERMISSIONS: Record<Role, AppPermission[]> = {
  ADMIN: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:archive",
    "orders:delete",
    "orders:status",
    "buyers:view",
    "buyers:create",
    "buyers:edit",
    "buyers:delete",
    "invoices:view",
    "invoices:create",
    "invoices:edit",
    "invoices:delete",
    "accounts:view",
    "expenses:create",
    "expenses:edit",
    "expenses:delete",
    "payments:create",
    "payments:view",
    "ledger:view_individual",
    "ledger:view_overall",
    "employees:view",
    "employees:manage",
    "advances:create",
    "advances:view",
    "bonuses:create",
    "payroll:settle",
    "payroll:view",
    "reports:view",
    "users:manage",
    "settings:manage",
    "audit:view",
  ],
  SUPER_STAFF: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:archive",
    "orders:status",
    "buyers:view",
    "buyers:create",
    "buyers:edit",
    "invoices:view",
    "invoices:create",
    "invoices:edit",
    "accounts:view",
    "expenses:create",
    "expenses:edit",
    "payments:create",
    "payments:view",
    "ledger:view_individual",
    "ledger:view_overall",
    "employees:view",
    "advances:create",
    "advances:view",
    "reports:view",
  ],
  STAFF: [
    "orders:view",
    "orders:create",
    "orders:edit",
    "orders:status",
    "buyers:view",
    "buyers:create",
  ],
  VIEWER: [
    "orders:view",
    "buyers:view",
    "invoices:view",
    "reports:view",
  ],
};

export function hasPermission(
  user: { role: Role; permissions?: string[] | null } | null | undefined,
  requiredPermission: AppPermission
): boolean {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;

  // Check role defaults
  const rolePerms = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  if (rolePerms.includes(requiredPermission)) return true;

  // Check custom individual permission overrides
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(requiredPermission);
  }

  return false;
}
