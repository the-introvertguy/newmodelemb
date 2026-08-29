"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import {
  CreateEmployeeSchema,
  RecordSalaryAdvanceSchema,
  RecordEmployeeBonusSchema,
  SettleMonthlySalarySchema,
} from "@/schemas";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calculatePayrollSettlement } from "@/services/payroll.service";

export interface GetEmployeesParams {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  search?: string;
}

export async function getEmployees({
  page = 1,
  pageSize = 20,
  isActive,
  search = "",
}: GetEmployeesParams = {}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "employees:view")) {
    throw new Error("Unauthorized: Insufficient permissions to view employees");
  }

  const skip = (Math.max(1, page) - 1) * pageSize;
  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { designation: { contains: search.trim(), mode: "insensitive" } },
      { phone: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        advances: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            monthYear: true,
            reason: true,
            date: true,
            isSettled: true,
          },
        },
        bonuses: {
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            monthYear: true,
            reason: true,
            date: true,
          },
        },
        settlements: {
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            monthYear: true,
            baseSalary: true,
            totalBonus: true,
            totalAdvanceDeducted: true,
            otherDeductions: true,
            netPaidAmount: true,
            paymentDate: true,
            paymentMethod: true,
            notes: true,
          },
        },
      },
    }),
  ]);

  return {
    employees,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getEmployeeProfile(employeeId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "employees:view")) {
    throw new Error("Unauthorized");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      advances: {
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { fullName: true } },
        },
      },
      bonuses: {
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { fullName: true } },
        },
      },
      settlements: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  return employee;
}

export async function createEmployee(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "employees:manage")) {
    throw new Error("Unauthorized: Insufficient permissions to manage employees");
  }

  const validated = CreateEmployeeSchema.parse(input);

  const employee = await prisma.employee.create({
    data: {
      name: validated.name.trim(),
      phone: validated.phone.trim(),
      address: validated.address.trim(),
      designation: validated.designation.trim(),
      joiningDate: validated.joiningDate,
      monthlySalary: validated.monthlySalary,
      notes: validated.notes?.trim() || null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "EMPLOYEE_CREATED",
    module: "EMPLOYEES",
    recordId: employee.id,
    details: { name: employee.name, designation: employee.designation },
  });

  revalidatePath("/employees");
  return { success: true, employee };
}

export async function updateEmployee(input: {
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  designation?: string;
  joiningDate?: Date;
  monthlySalary?: number;
  isActive?: boolean;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "employees:manage")) {
    throw new Error("Unauthorized: Insufficient permissions to manage employees");
  }

  const employee = await prisma.employee.update({
    where: { id: input.id },
    data: {
      name: input.name?.trim(),
      phone: input.phone?.trim(),
      address: input.address?.trim(),
      designation: input.designation?.trim(),
      joiningDate: input.joiningDate,
      monthlySalary: input.monthlySalary,
      isActive: input.isActive,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "EMPLOYEE_UPDATED",
    module: "EMPLOYEES",
    recordId: employee.id,
    details: { name: employee.name, designation: employee.designation },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${employee.id}`);
  return { success: true, employee };
}

export async function deleteEmployee(employeeId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "employees:manage")) {
    throw new Error("Unauthorized: Insufficient permissions to delete employee");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.salaryAdvance.deleteMany({ where: { employeeId } });
    await tx.employeeBonus.deleteMany({ where: { employeeId } });
    await tx.salaryPayment.deleteMany({ where: { employeeId } });
    await tx.employee.delete({ where: { id: employeeId } });
  });

  await logAuditEvent({
    userId: user.id,
    action: "EMPLOYEE_DELETED",
    module: "EMPLOYEES",
    recordId: employeeId,
    details: { name: employee.name },
  });

  revalidatePath("/employees");
  return { success: true };
}

/**
 * Record a Mid-Month Salary Advance
 */
export async function recordSalaryAdvance(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "advances:create")) {
    throw new Error("Unauthorized: Insufficient permissions to record salary advance");
  }

  const validated = RecordSalaryAdvanceSchema.parse(input);

  const advance = await prisma.salaryAdvance.create({
    data: {
      employeeId: validated.employeeId,
      amount: validated.amount,
      date: validated.date,
      reason: validated.reason.trim(),
      monthYear: validated.monthYear,
      createdById: user.id,
    },
    include: {
      employee: true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "SALARY_ADVANCE_LOGGED",
    module: "EMPLOYEES",
    recordId: advance.id,
    details: {
      employeeName: advance.employee.name,
      amount: advance.amount,
      monthYear: advance.monthYear,
    },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${validated.employeeId}`);
  return { success: true, advance };
}

/**
 * Record an Employee Bonus (e.g., Eid Festival Bonus, Performance)
 */
export async function recordEmployeeBonus(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "bonuses:create")) {
    throw new Error("Unauthorized: Insufficient permissions to record bonus");
  }

  const validated = RecordEmployeeBonusSchema.parse(input);

  const bonus = await prisma.employeeBonus.create({
    data: {
      employeeId: validated.employeeId,
      amount: validated.amount,
      date: validated.date,
      reason: validated.reason.trim(),
      monthYear: validated.monthYear,
      createdById: user.id,
    },
    include: {
      employee: true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "EMPLOYEE_BONUS_LOGGED",
    module: "EMPLOYEES",
    recordId: bonus.id,
    details: {
      employeeName: bonus.employee.name,
      amount: bonus.amount,
      reason: bonus.reason,
    },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${validated.employeeId}`);
  return { success: true, bonus };
}

/**
 * Month-End Salary Settlement Engine
 * Calculates: Net = Base Salary + Bonuses - Advances - Other Deductions
 * Marks advances for that month as settled
 */
export async function settleMonthlySalary(input: unknown) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "payroll:settle")) {
    throw new Error("Unauthorized: Insufficient permissions to settle payroll");
  }

  const validated = SettleMonthlySalarySchema.parse(input);

  const employee = await prisma.employee.findUnique({
    where: { id: validated.employeeId },
    include: {
      advances: {
        where: {
          monthYear: { lte: validated.monthYear },
          isSettled: false,
        },
      },
      bonuses: {
        where: {
          monthYear: validated.monthYear,
        },
      },
    },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  // Check if already settled for this month
  const existingSettlement = await prisma.salaryPayment.findUnique({
    where: {
      employeeId_monthYear: {
        employeeId: validated.employeeId,
        monthYear: validated.monthYear,
      },
    },
  });

  if (existingSettlement) {
    throw new Error(
      `Salary for ${employee.name} for month ${validated.monthYear} has already been settled.`
    );
  }

  const { baseSalary, totalBonuses, totalAdvances, otherDeductions, netPaidAmount } =
    calculatePayrollSettlement({
      monthlySalary: employee.monthlySalary,
      bonuses: employee.bonuses,
      advances: employee.advances,
      otherDeductions: validated.otherDeductions,
    });

  const settlement = await prisma.$transaction(async (tx) => {
    // 1. Create settlement record
    const payment = await tx.salaryPayment.create({
      data: {
        employeeId: validated.employeeId,
        monthYear: validated.monthYear,
        baseSalary,
        totalBonus: totalBonuses,
        totalAdvanceDeducted: totalAdvances,
        otherDeductions,
        netPaidAmount,
        paymentDate: validated.paymentDate,
        paymentMethod: validated.paymentMethod as PaymentMethod,
        notes: validated.notes?.trim() || null,
      },
    });

    // 2. Mark all advances for or up to this month as settled
    await tx.salaryAdvance.updateMany({
      where: {
        employeeId: validated.employeeId,
        monthYear: { lte: validated.monthYear },
        isSettled: false,
      },
      data: {
        isSettled: true,
      },
    });

    return payment;
  });

  await logAuditEvent({
    userId: user.id,
    action: "SALARY_SETTLED",
    module: "EMPLOYEES",
    recordId: settlement.id,
    details: {
      employeeName: employee.name,
      monthYear: validated.monthYear,
      netPaidAmount,
      baseSalary,
      totalAdvances,
      totalBonuses,
    },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${validated.employeeId}`);
  revalidatePath("/reports");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true, settlement };
}
