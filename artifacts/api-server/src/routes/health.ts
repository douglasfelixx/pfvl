import { Router } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";

const router = Router();

router.get("/healthz", (_req: IncomingMessage, res: ServerResponse) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ status: "ok" }));
});

export default router;
