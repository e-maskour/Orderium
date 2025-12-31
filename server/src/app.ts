import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { apiRateLimit } from "./middlewares/rateLimit";
import { notFound, errorHandler } from "./middlewares/error";
import { getPool } from "./db/pool";
import productRoutes from "./modules/products/product.routes";

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(express.json({ limit: "1mb" }));

    app.use(cors({
        origin: env.corsOrigin.split(",").map(o => o.trim()),
        credentials: true,
    }));

    app.use(apiRateLimit);

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
    app.use(notFound);
    app.use(errorHandler);
    
    return app;
}