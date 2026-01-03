import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { createServer } from "http";
import { initializeSocket } from "./socket/socket";

const app = createApp();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(env.port, () => {
    logger.info(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    logger.info(`Socket.io ready for connections`);
});