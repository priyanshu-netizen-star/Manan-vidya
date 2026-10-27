import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { SESSION_COOKIE, userForToken, type SessionUser } from "./auth";
import { can, type Permission } from "./rbac";
import { rateLimit } from "./ratelimit";

/** Error with an HTTP status that is safe to show to the caller. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/**
 * Wraps every route handler: same-origin enforcement for state-changing methods,
 * uniform JSON errors, and no internal error details leaked to the client.
 */
export function route(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const issue = e.issues[0];
        const field = issue?.path.join(".");
        return NextResponse.json(
          { error: field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input") },
          { status: 400 },
        );
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) throw new ApiError(403, "Missing origin");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Invalid origin");
  }
  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => {
        try {
          return new URL(o).host;
        } catch {
          return o;
        }
      }),
  );
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (originHost !== host && !allowed.has(originHost)) throw new ApiError(403, "Cross-origin request blocked");
}

export function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export async function apiUser(req: NextRequest, permission?: Permission): Promise<SessionUser> {
  const user = await userForToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) throw new ApiError(401, "Please sign in.");
  if (permission && !can(user.role, permission)) throw new ApiError(403, "You do not have permission to do this.");
  return user;
}

const MAX_BODY = 64 * 1024;

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new ApiError(413, "Request too large");
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
  return schema.parse(data);
}

export function limit(req: NextRequest, bucket: string, max: number, windowSeconds: number) {
  if (!rateLimit(`${bucket}:${clientIp(req)}`, max, windowSeconds)) {
    throw new ApiError(429, "Too many requests. Please wait a moment and try again.");
  }
}

export function intParam(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "Invalid id");
  return n;
}

export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });
