"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { CreateUserSchema, UpdateUserSchema } from "@/schemas";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "users:manage")) {
    throw new Error("Unauthorized: Only Admins can manage users");
  }

  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      status: true,
      permissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function createUser(input: unknown) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "users:manage")) {
    throw new Error("Unauthorized: Only Admins can create users");
  }

  const validated = CreateUserSchema.parse(input);

  const existing = await prisma.user.findUnique({
    where: { username: validated.username.toLowerCase().trim() },
  });

  if (existing) {
    throw new Error(`Username "${validated.username}" is already taken`);
  }

  const passwordHash = await bcrypt.hash(validated.password, 10);

  const user = await prisma.user.create({
    data: {
      username: validated.username.toLowerCase().trim(),
      fullName: validated.fullName.trim(),
      passwordHash,
      role: validated.role as Role,
      status: UserStatus.ACTIVE,
      permissions: validated.permissions,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      status: true,
      permissions: true,
    },
  });

  await logAuditEvent({
    userId: currentUser.id,
    action: "USER_CREATED",
    module: "USERS",
    recordId: user.id,
    details: { username: user.username, role: user.role },
  });

  revalidatePath("/users");
  return { success: true, user };
}

export async function updateUser(input: unknown) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "users:manage")) {
    throw new Error("Unauthorized: Only Admins can edit users");
  }

  const validated = UpdateUserSchema.parse(input);

  const updateData: any = {};
  if (validated.fullName) updateData.fullName = validated.fullName.trim();
  if (validated.role) updateData.role = validated.role as Role;
  if (validated.status) updateData.status = validated.status as UserStatus;
  if (validated.permissions) updateData.permissions = validated.permissions;
  if (validated.password && validated.password.length >= 6) {
    updateData.passwordHash = await bcrypt.hash(validated.password, 10);
  }

  const user = await prisma.user.update({
    where: { id: validated.id },
    data: updateData,
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      status: true,
      permissions: true,
    },
  });

  await logAuditEvent({
    userId: currentUser.id,
    action: "USER_UPDATED",
    module: "USERS",
    recordId: user.id,
    details: { username: user.username, role: user.role, status: user.status },
  });

  revalidatePath("/users");
  return { success: true, user };
}
