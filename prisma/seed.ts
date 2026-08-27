import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Initializing New Model Embroidery System...");

  // 1. Company Settings
  const settings = await prisma.companySetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "New Model Embroidery",
      subtitle: "( A Computerized Embroidery Project )",
      address: "South Azampur, House 23, R-1, Block-A, Jalal Ahmed Soroni Road, Dhakhin Khan, Dhaka-1230",
      phones: "01731-992361, 01971-992361, 0013472992519",
      email: "newmodelemb@gmail.com",
      proprietorName: "Radwen Hossain",
      currencySymbol: "৳",
      orderPrefix: "",
      invoicePrefix: "",
      paymentPrefix: "PAY-",
    },
  });
  console.log("✅ Company Settings Initialized:", settings.companyName);

  // 2. Default Expense Categories
  const categories = [
    { name: "Transportation & Fuel", isDefault: true },
    { name: "Electricity & Power", isDefault: true },
    { name: "Machine Maintenance & Spares", isDefault: true },
    { name: "Tea, Coffee & Buyer Hospitality", isDefault: true },
    { name: "Office Stationery & Admin", isDefault: true },
    { name: "Thread, Needles & Raw Materials", isDefault: true },
    { name: "Machine Oil & Consumables", isDefault: true },
    { name: "Miscellaneous", isDefault: true },
  ];

  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Expense Categories Seeded (8 default categories)");

  // 3. Default Users (Admin, Super Staff, Staff)
  const adminPasswordHash = await bcrypt.hash("Admin123456!", 10);
  const staffPasswordHash = await bcrypt.hash("Staff123456!", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Radwen Hossain (Admin)",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: ["*"],
    },
  });

  await prisma.user.upsert({
    where: { username: "superstaff" },
    update: {},
    create: {
      username: "superstaff",
      fullName: "Production Manager",
      passwordHash: staffPasswordHash,
      role: Role.SUPER_STAFF,
      status: UserStatus.ACTIVE,
      permissions: [],
    },
  });

  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      fullName: "Floor Operator",
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      permissions: [],
    },
  });
  console.log(`✅ Default Users Ready:
  - Admin: admin / Admin123456!
  - Super Staff: superstaff / Staff123456!
  - Staff: staff / Staff123456!`);

  console.log("✨ Clean System Setup Completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
