import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { getEnvironment } from "@/lib/env";

const env = getEnvironment();

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql"
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true
  },
  user: {
    fields: {
      name: "displayName"
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 10,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 3
      },
      "/sign-up/email": {
        window: 60,
        max: 5
      }
    }
  },
  advanced: {
    database: {
      joins: true
    }
  }
});
