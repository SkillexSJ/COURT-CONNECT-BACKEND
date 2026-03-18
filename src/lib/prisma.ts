import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Construct the database connection string
const connectionString = `${process.env.DATABASE_URL}`;

// Initialize Prisma Client with PostgreSQL adapter
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
