/**
 * NODE PACKAGES
 */
import { Server } from "http";

/**
 * LIBS
 */
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

/**
 * CONFIG
 */
import config from "./config/index.js";

const PORT = config.port;
let server: Server;

async function main() {
  try {
    await prisma.$connect();

    console.log("Connected to the database successfully.");

    server = app.listen(PORT, () => {
      console.log(`CourtConnect Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("An error occurred:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection detected:", err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception detected:", err);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  if (server) {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);