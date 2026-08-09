# Morocom

Morocom is a multi-tenant SaaS ERP built as a pnpm monorepo, designed to run the day-to-day
commercial operations of small and mid-sized businesses. The backend is a NestJS 10 REST API
backed by PostgreSQL through TypeORM, with every piece of business data scoped to its own tenant.
Around it sit four React 18 front-ends: a back-office for administrators, a customer portal, a
delivery portal, and a tenant self-service dashboard, plus a shared component library. Together
they cover products and inventory, partners, orders, quotes, invoicing, payments, deliveries, and
an analytics suite of financial and commercial reports.
