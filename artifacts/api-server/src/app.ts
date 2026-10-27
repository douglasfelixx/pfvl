import express from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { pinoHttp } from "pino-http";
import healthRouter from "./routes/health.js";
import pfvlRouter from "./routes/pfvl.js";
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

app.use(
  (
    req: IncomingMessage,
    res: ServerResponse,
    next: (...args: unknown[]) => void,
  ) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method ?? "")) {
    next();
    return;
  }

  const getHeader = (name: string) => {
    const value = req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };
  const origin = getHeader("origin");
  if (origin) {
    const requestHost = (
      getHeader("x-forwarded-host")?.split(",")[0] ??
      getHeader("host") ??
      ""
    ).trim();
    try {
      if (
        new URL(origin).host !== requestHost &&
        !allowedOrigins.has(origin)
      ) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Origem da solicitação não permitida" }));
        return;
      }
    } catch {
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Origem da solicitação inválida" }));
      return;
    }
  } else if (
    getHeader("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Solicitação inválida" }));
    return;
  }

  next();
  },
);

app.use("/api", healthRouter, pfvlRouter);

export default app;
