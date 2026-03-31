import NextAuth from "next-auth"
import type { User } from "next-auth"
import authConfig from "./auth.config"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import { logger } from "./logger"

function toSerializableError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") return { raw: String(error) };
  const e = error as {
    name?: string;
    message?: string;
    stack?: string;
    type?: string;
    cause?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const causeObj =
    e.cause && typeof e.cause === "object"
      ? (e.cause as Record<string, unknown>)
      : undefined;

  return {
    name: e.name,
    type: e.type,
    message: e.message,
    code: e.code,
    status: e.status,
    causeMessage:
      causeObj && typeof causeObj.message === "string"
        ? causeObj.message
        : undefined,
    causeCode:
      causeObj && typeof causeObj.code === "string" ? causeObj.code : undefined,
    causeStatus:
      causeObj && typeof causeObj.status === "number"
        ? causeObj.status
        : undefined,
    causeBody:
      causeObj && "body" in causeObj ? (causeObj.body as unknown) : undefined,
    stack: e.stack,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  logger: {
    error(error) {
      logger.error("auth.error", toSerializableError(error));
    },
    warn(code) {
      logger.warn("auth.warn", { code });
    },
    debug(message, metadata) {
      logger.debug("auth.debug", { message, metadata });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      } else if (token.sub) {
        // Role can change after initial sign-in (e.g. become-organizer).
        // Refresh role from DB so RBAC works without requiring re-login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (dbUser) token.role = dbUser.role;
        token.id = token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.role) {
          session.user.role = token.role as string;
        }
      }
      return session;
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      logger.info("auth.sign_in", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        isNewUser,
      });
    },
    async createUser({ user }: { user: User }) {
      if (user.email) {
        const { sendWelcomeEmail } = await import("@/lib/email");
        await sendWelcomeEmail(user.email, user.name || "there");
      }
    }
  },
  ...authConfig,
})
