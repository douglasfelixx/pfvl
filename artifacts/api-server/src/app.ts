import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app = express();
const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
const clerkConfigured = Boolean(
  clerkSecretKey?.startsWith("sk_") && clerkPublishableKey?.startsWith("pk_"),
);
const allowedOrigins = new Set(
  (process.env.PFVL_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
if (clerkConfigured) {
  app.use(
    clerkMiddleware({
      secretKey: clerkSecretKey,
      publishableKey: clerkPublishableKey,
    }),
  );
}

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, false);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    const requestHost = (
      req.get("x-forwarded-host")?.split(",")[0] ??
      req.get("host") ??
      ""
    ).trim();
    try {
      if (
        new URL(origin).host !== requestHost &&
        !allowedOrigins.has(origin)
      ) {
        res.status(403).json({ error: "Origem da solicitação não permitida" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Origem da solicitação inválida" });
      return;
    }
  } else if (!req.is("application/json")) {
    res.status(403).json({ error: "Solicitação inválida" });
    return;
  }

  next();
});

app.use("/api", router);

export default app;
