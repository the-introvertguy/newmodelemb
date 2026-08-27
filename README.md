# New Model Embroidery Management System

A centralized operational and financial management system built for New Model Embroidery factory operations in Dhaka, Bangladesh.

## Overview

The application streamlines daily embroidery factory operations, including order tracking, line-item pricing, cloud-based design attachments, customizable bill generation, buyer ledgers, factory overhead expenses, payroll with salary advances, and system audit logs.

## Core Features

- Order Management: Sequential monthly order numbering (YYYYMM0001), single Challan tracking, line items with style and design references, status pipelines, order archiving, and soft-deletion with full ledger synchronization.
- Cloud Attachments: Direct-to-cloud image uploads with client-side naming, inline renaming, thumbnail previews, dynamic aspect-ratio support, and storage cleanup on order removal.
- Invoicing and Billing: Customizable bill generation with custom cost additions, VAT calculations, discount adjustments, automated Taka in words conversion, Merriweather typography, and server-rendered PDF downloads.
- Accounts and Financials: Unified gains and expenses ledger, customizable overhead categories, cash movement tracking, and automated balance calculation.
- Buyer Profiles and Ledgers: Company profiles, order history, contact information, itemized debit/credit running balances, and payment receipt logging.
- Employee Payroll: Staff directory, mid-month cash advance logging, festival and performance bonuses, and monthly salary settlement calculation.
- Security and Access Control: Role-based access control (Admin, Super Staff, Staff, Viewer), bcrypt credential authentication, and system audit trails.
- Responsive Interface: Fully mobile-responsive interface optimized for desktop and handheld devices with Ubuntu typography and unified warm beige theme.

## Technology Stack

- Framework: Next.js 15 (App Router, Server Actions, Route Handlers)
- UI and Styling: React 19, Tailwind CSS, Lucide Icons, Ubuntu Typography
- Database: PostgreSQL (Aiven) managed with Prisma ORM
- Cloud Storage: Cloudinary with HMAC-SHA256 signed uploads
- PDF Generation: React-PDF server rendering
- Authentication: NextAuth.js (Credentials Provider)

## Getting Started

### Prerequisites

- Node.js 18.18 or later
- PostgreSQL database instance
- Cloudinary account credentials

### Environment Variables

Configure the following environment variables in .env.local:

- DATABASE_URL: PostgreSQL connection string with SSL
- NEXTAUTH_SECRET: Secret key for session encryption
- NEXTAUTH_URL: Base URL of the application
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: Cloudinary cloud identifier
- CLOUDINARY_API_KEY: Cloudinary API key
- CLOUDINARY_API_SECRET: Cloudinary API secret

### Installation

1. Install dependencies:
```
   npm install
```
2. Synchronize database schema:
```
   npx prisma db push
```
3. Seed initial users and factory defaults:
```
   npm run seed
```
4. Start development server:
```
   npm run dev
```

## Default User Accounts

- Admin: admin / Admin123456!
- Super Staff: superstaff / Staff123456!
- Staff: staff / Staff123456!

## Production Build

To compile and run the production build:
```
npm run build
npm run start
```