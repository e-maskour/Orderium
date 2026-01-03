import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { apiRateLimit } from "./middlewares/rateLimit";
import { notFound, errorHandler } from "./middlewares/error";
import { getPool } from "./db/pool";
import productRoutes from "./modules/products/product.routes";
import customerRoutes from "./modules/customers/customer.routes";
import orderRoutes from "./modules/orders/order.routes";
import portalRoutes from "./modules/portal/portal.routes";
import deliveryRoutes from "./modules/delivery/delivery.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import { customerService } from "./modules/customers/customer.service";
import { portalRepository } from "./modules/portal/portal.repo";
import { deliveryService } from "./modules/delivery/delivery.service";
import { notificationRepo } from "./modules/notifications/notification.repo";
import { seedDeliveryPerson } from "./seeders/deliveryPersonSeeder";
import { seedAdmin } from "./seeders/adminSeeder";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(express.json({ limit: "1mb" }));

    app.use(cors({
        origin: env.corsOrigin.split(",").map(o => o.trim()),
        credentials: true,
    }));

    app.use(apiRateLimit);

    // Initialize customer service (add missing columns)
    customerService.initialize().catch(err => {
        console.error("Failed to initialize customer service:", err);
    });

    // Initialize portal table
    portalRepository.initialize().catch(err => {
        console.error("Failed to initialize portal:", err);
    });

    // Initialize delivery service and seed data
    deliveryService.initialize()
        .then(() => {
            console.log("✅ Delivery service initialized");
            // Seed delivery person and admin after initialization
            return Promise.all([
                seedDeliveryPerson(),
                seedAdmin()
            ]);
        })
        .catch(err => {
            console.error("Failed to initialize delivery service or seed data:", err);
        });

    // Initialize notifications table
    notificationRepo.initialize().catch(err => {
        console.error("Failed to initialize notifications:", err);
    });

    // Health check endpoint
    app.get("/health", async (_req, res, next) => {
        try {
            const pool = await getPool();
            await pool.request().query("SELECT 1");
            res.status(200).json({ db: "ok" });
        } catch (err) {
            next(err);
        }
    });

    // Register other routes
    app.use("/api/products", productRoutes);
    app.use("/api/customers", customerRoutes);
    app.use("/api/orders", orderRoutes);
    app.use("/api/portal", portalRoutes);
    app.use("/api/delivery", deliveryRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use(notFound);
    app.use(errorHandler);
    
    return app;
}