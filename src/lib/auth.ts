import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BASE_PATH } from "./config";
import { getDb } from "./db";
import { verifyPassword } from "./password";
import { can, type Permission, type Role } from "./rbac";

export const SESSION_COOKIE = "mv_session";
const SESSION_HOURS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
};

// ─── Sessions ───────────────────────────────────────────────────────────────

const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: BASE_PATH,
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(userId: number, meta: { ip?: string; userAgent?: string }) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.query("INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES ($1,$2,$3,$4,$5)", [
    tokenId(token), userId, expires.toISOString(), meta.ip ?? null, (meta.userAgent ?? "").slice(0, 300),
  ]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_HOURS * 3600));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.query("DELETE FROM sessions WHERE id = $1", [tokenId(token)]);
  }
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export async function userForToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const row = await db.one<{ id: number; name: string; email: string; role: Role; student_id: number | null }>(
    `SELECT u.id, u.name, u.email, u.role, u.student_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now() AND u.active`,
    [tokenId(token)],
  );
  return row ? { id: row.id, name: row.name, email: row.email, role: row.role, studentId: row.student_id } : null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return userForToken(jar.get(SESSION_COOKIE)?.value);
}

/** For server components: redirect to sign-in, or to the dashboard when the permission is missing. */
export async function requirePageUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (permission && !can(user.role, permission)) redirect("/app?denied=1");
  return user;
}

// ─── Login ──────────────────────────────────────────────────────────────────

export type LoginResult = { ok: true; user: SessionUser } | { ok: false; error: string };

export async function attemptLogin(email: string, password: string): Promise<LoginResult> {
  const db = await getDb();
  const row = await db.one<{
    id: number; name: string; email: string; role: Role; student_id: number | null;
    password_hash: string; active: boolean; failed_logins: number; locked_until: string | null;
  }>("SELECT * FROM users WHERE lower(email) = lower($1)", [email.trim()]);

  const generic = { ok: false as const, error: "Incorrect email or password." };
  if (!row || !row.active) {
    await verifyPassword(password, "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(88)); // equalise timing
    return generic;
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { ok: false, error: `Account temporarily locked after repeated failed sign-ins. Try again in ${LOCK_MINUTES} minutes.` };
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    if (failed >= MAX_FAILED_LOGINS) {
      await db.query(
        `UPDATE users SET failed_logins = 0, locked_until = now() + make_interval(mins => $2) WHERE id = $1`,
        [row.id, LOCK_MINUTES],
      );
    } else {
      await db.query("UPDATE users SET failed_logins = $2 WHERE id = $1", [row.id, failed]);
    }
    return generic;
  }
  await db.query("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [row.id]);
  return { ok: true, user: { id: row.id, name: row.name, email: row.email, role: row.role, studentId: row.student_id } };
}

/** For pages reachable with any one of several permissions. */
export async function requireAnyPermission(...permissions: Permission[]): Promise<SessionUser> {
  const user = await requirePageUser();
  if (!permissions.some((p) => can(user.role, p))) redirect("/app?denied=1");
  return user;
}
