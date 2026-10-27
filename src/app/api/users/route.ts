import { z } from "zod";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { ApiError, apiUser, body, clientIp, ok, route } from "@/lib/http";
import { hashPassword, passwordProblem } from "@/lib/password";
import { ROLES } from "@/lib/rbac";

const NewUser = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
  studentId: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable()),
  password: z.string().min(1).max(200),
});

export const POST = route(async (req) => {
  const user = await apiUser(req, "users.manage");
  const u = await body(req, NewUser);
  const problem = passwordProblem(u.password);
  if (problem) throw new ApiError(400, problem);
  if ((u.role === "student" || u.role === "parent") && !u.studentId) throw new ApiError(400, "Student and parent accounts must be linked to a student record.");
  const db = await getDb();
  if (await db.one("SELECT 1 FROM users WHERE lower(email) = $1", [u.email])) throw new ApiError(409, "An account with that email already exists.");
  if (u.studentId && !(await db.one("SELECT 1 FROM students WHERE id = $1", [u.studentId]))) throw new ApiError(400, "Student record not found.");
  const row = await db.one<{ id: number }>(
    "INSERT INTO users (email, name, role, password_hash, student_id) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [u.email, u.name, u.role, await hashPassword(u.password), u.role === "student" || u.role === "parent" ? u.studentId : null],
  );
  await audit(db, user.id, "user.create", "user", row!.id, { role: u.role }, clientIp(req));
  return ok({ id: row!.id }, 201);
});
