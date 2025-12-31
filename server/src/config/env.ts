import dotenv from "dotenv";
dotenv.config();

function must(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Loading env var ${name} failed`);
    return v;
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3000),

    db: {
        host: must("DB_HOST"),
        name: must("DB_NAME"),
        user: must("DB_USER"),
        password: must("DB_PASSWORD"),
    },

    jwtSecret: must("JWT_SECRET"),

    corsOrigin: must("CORS_ORIGIN"), // Allowed origin for CORS
};