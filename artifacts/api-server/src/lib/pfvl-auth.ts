import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export type PfvlUser = typeof usersTable.$inferSelect;

type AuthenticatedRequest = Request & { pfvlUser?: PfvlUser };

const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();

export const clerkConfigured = Boolean(
  clerkSecretKey?.startsWith("sk_") && clerkPublishableKey?.startsWith("pk_"),
);

async function getOrProvisionUser(
  req: Request,
  userId: string,
): Promise<PfvlUser | null> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId))
    .limit(1);
  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }

  const email = primaryEmail.emailAddress.trim().toLowerCase();
  const displayName =
    clerkUser.fullName?.trim() ||
    clerkUser.username?.trim() ||
    email.split("@")[0] ||
    "Membro PFVL";
  const adminEmail = process.env.PFVL_ADMIN_EMAIL?.trim().toLowerCase();

  await db
    .insert(usersTable)
    .values({
      clerkUserId: userId,
      email,
      displayName: displayName.slice(0, 100),
      role: adminEmail && email === adminEmail ? "admin" : "member",
      status: "active",
    })
    .onConflictDoNothing({ target: usersTable.clerkUserId });

  const [created] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId))
    .limit(1);

  if (!created) {
    req.log?.error({ userId }, "PFVL account could not be provisioned");
    return null;
  }
  return created;
}

export const requirePfvlUser: RequestHandler = async (req, res, next) => {
  if (!clerkConfigured) {
    res.status(503).json({ error: "Autenticação ainda não configurada" });
    return;
  }

  let userId: string | null = null;
  try {
    userId = getAuth(req).userId;
  } catch {
    res.status(401).json({ error: "Entre na sua conta PFVL para continuar" });
    return;
  }

  if (!userId) {
    res.status(401).json({ error: "Entre na sua conta PFVL para continuar" });
    return;
  }

  try {
    const user = await getOrProvisionUser(req, userId);
    if (!user) {
      res.status(403).json({ error: "Confirme seu e-mail no provedor de acesso" });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ error: "Esta conta está suspensa" });
      return;
    }
    (req as AuthenticatedRequest).pfvlUser = user;
    next();
  } catch (error) {
    req.log?.error({ err: error }, "PFVL account verification failed");
    res.status(503).json({ error: "Não foi possível validar sua conta agora" });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const user = (req as AuthenticatedRequest).pfvlUser;
  if (!user) {
    res.status(401).json({ error: "Entre na sua conta PFVL para continuar" });
    return;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Esta ação exige perfil administrador" });
    return;
  }
  next();
};

export function getPfvlUser(req: Request): PfvlUser {
  const user = (req as AuthenticatedRequest).pfvlUser;
  if (!user) throw new Error("Authenticated PFVL profile is missing");
  return user;
}
