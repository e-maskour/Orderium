# Morocom

> **Cloud-based ERP platform built for Moroccan businesses.**

---

## Overview

Morocom is a multi-tenant SaaS ERP system that digitalizes and centralizes the core operations of small and medium-sized businesses — from sales and purchasing, to inventory, invoicing, delivery, and customer management — all in one platform.

It is purpose-built for the Moroccan market: bilingual (Arabic & French), compliant with local business document standards (ICE, IF, RC), and designed to replace the manual, paper-based workflows that most SMEs still rely on today.

---

## Who It's For

| Role | Application | Purpose |
|------|-------------|---------|
| Business owner / admin | **Backoffice** | Full operational control — products, orders, inventory, invoices, partners, users, and more |
| Customer | **Client portal** | Browse products, place orders, track history |
| Delivery person | **Delivery portal** | View assigned deliveries, update statuses in the field |
| Tenant owner | **Tenant dashboard** | Manage subscription, configure the account, onboard the business |

---

## Core Features

### Sales & Purchasing
- Create and manage **quotes (devis)**, **purchase/sales orders**, **delivery notes (bons de livraison)**, and **invoices (factures)** — each with their own configurable numbering sequences
- Full document lifecycle: draft → validated → paid → archived
- Convert between document types (e.g., quote → order → delivery note → invoice) in one click
- Supports both **vente (sales)** and **achat (purchasing)** directions

### Inventory Management
- Real-time **stock tracking** across multiple warehouses
- **Stock adjustments** with reason tracking
- **Units of measure (UoM)** support per product
- Product catalog with categories, pricing, and tax configuration

### Invoicing & Payments
- Generate legally-compliant invoices with partner **ICE**, **IF**, and **RC** numbers
- Track **partial payments**, **payment terms**, and **remaining balances**
- Multiple payment methods per invoice
- Export invoices to **PDF** directly from the system

### Partner & CRM Management
- Unified partner directory for **customers and suppliers**
- Store fiscal identifiers (ICE, IF, RC, CNSS) for compliance
- Track all documents associated with each partner

### Delivery Management
- Assign deliveries to delivery personnel
- Track delivery status in real time via the dedicated delivery portal
- Delivery persons interact through a mobile-friendly interface

### Roles & Permissions
- Granular **role-based access control (RBAC)**
- Define custom roles with fine-grained permissions per feature
- Assign roles to users across the organization

### Notifications
- Real-time **push notifications** via Firebase Cloud Messaging (FCM)
- Notify staff on order updates, delivery assignments, payment confirmations, and more
- Notification history and read/unread state tracked per user

### File & Document Storage
- Built-in **drive** for uploading and organizing files per business
- Image upload and CDN delivery for product photos
- PDF generation and storage for all document types

---

## Architecture

Morocom is a **pnpm monorepo** composed of five applications sharing a single REST API:

```
morocom/
├── api/                 # NestJS 10 + TypeORM + PostgreSQL  — Central REST API
├── backoffice/          # React 18 + Vite + PrimeReact      — Admin dashboard
├── client/              # React 18 + Vite                   — Customer portal
├── delivery-portal/     # React 18 + Vite                   — Delivery operations UI
├── tenant-dashboard/    # React 18 + Vite + Tailwind        — Tenant self-service
└── shared/              # TypeScript                        — Shared UI components & assets
```

### Key Technical Properties
- **Multi-tenancy** — Each business is fully isolated at the database level via a tenant connection service. No data leaks between tenants.
- **JWT authentication** — All routes are protected by default. Portal-scoped tokens (customers, delivery persons) are strictly separated from admin tokens.
- **PostgreSQL** — Relational database with TypeORM migrations (no `synchronize: true` in production).
- **Dockerized** — Full `docker-compose` setup for development, infrastructure, and production.
- **Swagger** — Auto-generated API documentation for all endpoints.

---

## Built for Moroccan SMEs

Most small and medium businesses in Morocco still manage orders via WhatsApp, track stock in Excel, and issue handwritten invoices. Morocom replaces this entirely:

| Problem | Morocom Solution |
|---------|-----------------|
| Orders tracked via WhatsApp/phone | Structured order management with full history |
| Stock counted manually | Real-time inventory across warehouses |
| Invoices written by hand | Auto-numbered, PDF-ready, legally compliant invoices |
| No visibility on unpaid invoices | Payment tracking with remaining balance per invoice |
| Delivery coordination by phone | Dedicated delivery portal with live status updates |
| Disconnected tools per department | Single platform connecting all operations |
| French-only enterprise ERP | Bilingual Arabic & French interface |
