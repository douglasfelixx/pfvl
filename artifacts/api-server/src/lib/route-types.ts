import type { IncomingMessage, ServerResponse } from "node:http";

export type PfvlRequest = IncomingMessage & {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, unknown>;
};

export type PfvlResponse = ServerResponse & {
  status(code: number): PfvlResponse;
  json(body: unknown): PfvlResponse;
};

export type PfvlNext = (error?: unknown) => void;
