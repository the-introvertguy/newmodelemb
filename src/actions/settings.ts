"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { UpdateCompanySettingSchema } from "@/schemas";
import { revalidatePath } from "next/cache";

export async function getCompanySettings() {
  let settings = await prisma.companySetting.findFirst();
  if (!settings) {
    settings = await prisma.companySetting.create({
      data: {
        companyName: "New Model Embroidery",
        subtitle: "( A Computerized Embroidery Project )",
        phones: "01731-992361, 01971-992361, 0013472992519",
        email: "newmodelemb@gmail.com",
        address:
          "South Azampur, House 23, R-1, Block-A, Jalal Ahmed Soroni Road, Dhakhin Khan, Dhaka-1230",
        proprietorName: "Radwen Hossain",
        currencySymbol: "৳",
      },
    });
  }
  return settings;
}

export async function updateCompanySettings(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings:manage")) {
    throw new Error("Unauthorized: Only Admins can update company settings");
  }

  const validated = UpdateCompanySettingSchema.parse(input);

  const existing = await getCompanySettings();

  const updated = await prisma.companySetting.update({
    where: { id: existing.id },
    data: {
      companyName: validated.companyName.trim(),
      subtitle: validated.subtitle?.trim() || "( A Computerized Embroidery Project )",
      logoUrl: validated.logoUrl?.trim() || null,
      phones: validated.phones.trim(),
      email: validated.email.trim(),
      address: validated.address.trim(),
      proprietorName: validated.proprietorName.trim(),
      currencySymbol: validated.currencySymbol,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "COMPANY_SETTINGS_UPDATED",
    module: "SETTINGS",
    recordId: updated.id,
    details: validated,
  });

  revalidatePath("/settings");
  return { success: true, settings: updated };
}

export async function getAuditLogs(page = 1, pageSize = 30) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "audit:view")) {
    throw new Error("Unauthorized: Only Admins can view audit logs");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
