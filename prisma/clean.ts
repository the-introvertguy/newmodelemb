import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanData() {
  console.log("🧹 Cleaning all sample data from database while preserving the 3 users...");

  // Delete all orders & invoice relations
  await prisma.orderAttachment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.invoiceOrder.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.buyerLedgerEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.buyer.deleteMany({});

  // Delete all payroll & employee records
  await prisma.salaryAdvance.deleteMany({});
  await prisma.employeeBonus.deleteMany({});
  await prisma.salaryPayment.deleteMany({});
  await prisma.employee.deleteMany({});

  // Delete expenses & audit logs
  await prisma.expense.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // Delete any non-default users (keep only admin, superstaff, staff)
  await prisma.user.deleteMany({
    where: {
      username: {
        notIn: ["admin", "superstaff", "staff"],
      },
    },
  });

  console.log("✅ All sample data successfully removed! The database is clean with only the 3 active users.");
}

cleanData()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
