import { z } from "zod";

// ========================
// AUTH & USERS
// ========================
export const LoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  fullName: z.string().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SUPER_STAFF", "STAFF", "VIEWER"]),
  permissions: z.array(z.string()).default([]),
});

export const UpdateUserSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2, "Full name is required").optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "SUPER_STAFF", "STAFF", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  permissions: z.array(z.string()).optional(),
});

// ========================
// BUYERS
// ========================
export const CreateBuyerSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  phone: z.string().min(6, "Phone number is required"),
  altPhone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().min(3, "Address is required"),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const UpdateBuyerSchema = CreateBuyerSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

// ========================
// ORDERS & ITEMS
// ========================
export const OrderItemSchema = z.object({
  id: z.string().optional(),
  productType: z.string().min(1, "Product name/type is required"),
  styleRef: z.string().optional().nullable().default("—"),
  designReference: z.string().min(1, "Design reference/description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  notes: z.string().optional().nullable(),
});

export const CreateOrderSchema = z.object({
  orderNumber: z.string().optional(),
  buyerId: z.string().min(1, "Buyer selection is required"),
  orderDate: z.coerce.date().default(() => new Date()),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  challanNumber: z.string().optional().nullable(),
  status: z
    .enum([
      "PENDING",
      "PRODUCT_RECEIVED",
      "IN_PRODUCTION",
      "COMPLETED",
      "READY_FOR_DELIVERY",
      "DELIVERED",
      "ON_HOLD",
      "CANCELLED",
    ])
    .default("PENDING"),
  notes: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).min(1, "At least one product line item is required"),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum([
    "PENDING",
    "PRODUCT_RECEIVED",
    "IN_PRODUCTION",
    "COMPLETED",
    "READY_FOR_DELIVERY",
    "DELIVERED",
    "ON_HOLD",
    "CANCELLED",
  ]),
});

export const UpdateOrderSchema = z.object({
  id: z.string(),
  buyerId: z.string().optional(),
  orderDate: z.coerce.date().optional(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  challanNumber: z.string().optional().nullable(),
  status: z
    .enum([
      "PENDING",
      "PRODUCT_RECEIVED",
      "IN_PRODUCTION",
      "COMPLETED",
      "READY_FOR_DELIVERY",
      "DELIVERED",
      "ON_HOLD",
      "CANCELLED",
    ])
    .optional(),
  notes: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).optional(),
});

export const ArchiveOrderSchema = z.object({
  orderId: z.string(),
  isArchived: z.boolean(),
});

// ========================
// ATTACHMENTS
// ========================
export const AttachOrderImageSchema = z.object({
  orderId: z.string(),
  imageUrl: z.string().url("Valid image URL required"),
  publicId: z.string(),
  category: z
    .enum(["CHALLAN", "DESIGN", "PRODUCT", "DELIVERY", "REFERENCE", "OTHER"])
    .default("OTHER"),
  caption: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  bytes: z.number().optional().nullable(),
});

// ========================
// INVOICES (BILLS)
// ========================
export const CreateInvoiceSchema = z.object({
  buyerId: z.string().min(1, "Buyer selection is required"),
  orderIds: z.array(z.string()).min(1, "At least one order must be selected"),
  invoiceDate: z.coerce.date().default(() => new Date()),
  referenceNote: z.string().optional().nullable(),
  subject: z.string().default("Bill for Embroidery orders."),
  salutationText: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  advanceReceived: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export const UpdateInvoiceSchema = z.object({
  id: z.string(),
  referenceNote: z.string().optional().nullable(),
  invoiceDate: z.coerce.date().optional(),
  subject: z.string().optional(),
  salutationText: z.string().optional().nullable(),
  discount: z.coerce.number().min(0).optional(),
  advanceReceived: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

// ========================
// PAYMENTS & EXPENSES
// ========================
export const RecordPaymentSchema = z.object({
  buyerId: z.string().min(1, "Buyer selection is required"),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "CHEQUE", "BKASH", "NAGAD", "OTHER"])
    .default("CASH"),
  referenceNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const CreateExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Expense amount must be greater than 0"),
  date: z.coerce.date().default(() => new Date()),
  description: z.string().min(2, "Description is required"),
  voucherNo: z.string().optional().nullable(),
});

export const CreateExpenseCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

// ========================
// EMPLOYEES & PAYROLL
// ========================
export const CreateEmployeeSchema = z.object({
  name: z.string().min(2, "Employee name is required"),
  phone: z.string().min(6, "Phone number is required"),
  address: z.string().min(3, "Address is required"),
  designation: z.string().min(2, "Designation is required"),
  joiningDate: z.coerce.date().default(() => new Date()),
  monthlySalary: z.coerce.number().positive("Base monthly salary must be positive"),
  notes: z.string().optional().nullable(),
});

export const RecordSalaryAdvanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.coerce.number().positive("Advance amount must be greater than 0"),
  date: z.coerce.date().default(() => new Date()),
  reason: z.string().min(2, "Reason is required"),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM (e.g. 2026-08)"),
});

export const RecordEmployeeBonusSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.coerce.number().positive("Bonus amount must be greater than 0"),
  date: z.coerce.date().default(() => new Date()),
  reason: z.string().min(2, "Bonus reason is required (e.g. Eid Bonus)"),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
});

export const SettleMonthlySalarySchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
  otherDeductions: z.coerce.number().min(0).default(0),
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "CHEQUE", "BKASH", "NAGAD", "OTHER"])
    .default("CASH"),
  notes: z.string().optional().nullable(),
});

// ========================
// COMPANY SETTINGS
// ========================
export const UpdateCompanySettingSchema = z.object({
  companyName: z.string().min(2),
  subtitle: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  phones: z.string().min(5),
  email: z.string().email(),
  address: z.string().min(5),
  proprietorName: z.string().min(2),
  currencySymbol: z.string().default("৳"),
});
