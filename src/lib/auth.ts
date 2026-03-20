import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import config from "../config/index.js";

export const auth = betterAuth({
  baseURL: config.better_auth_url,
  secret: config.better_auth_secret,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

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
      avatarPublicId: {
        type: "string",
        required: false,
      },
      stripeCustomerId: {
        type: "string",
        required: false,
      },
      memberSince: {
        type: "string",
        required: false,
      },
    },
  },
});
