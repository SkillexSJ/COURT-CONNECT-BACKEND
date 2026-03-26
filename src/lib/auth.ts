import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { envVars } from "../config/env.js";

export const auth = betterAuth({
  baseURL: envVars.BETTER_AUTH_URL,
  secret: envVars.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5000",
    "http://192.168.9.142:3000",
    "https://court-connect-frontend.vercel.app",
    envVars.CLIENT_URL || "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      isApproved: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      stripeCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
});
