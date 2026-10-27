/**
 * Database command-line tasks.
 *
 *   npm run db:migrate                       apply the schema (safe to repeat)
 *   npm run db:seed                          load synthetic presentation data into an EMPTY database
 *   npm run db:reset                         wipe everything and reload synthetic data (presentation only)
 *   npm run user:create -- --email a@b --name "Full Name" --role platform_admin [--student 12]
 *
 * Uses DATABASE_URL if set, otherwise the embedded database in PGLITE_DIR (default .data/pglite).
 */
import { initDb } from "../src/lib/db";
import { hashPassword, passwordProblem } from "../src/lib/password";
import { ROLES, type Role } from "../src/lib/rbac";
import { seedDatabase, wipeDatabase } from "../src/lib/seed";

const [cmd, ...rest] = process.argv.slice(2);
const arg = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(1);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const db = await initDb({ seed: false });
  console.log(`Database: ${db.driver === "pg" ? "PostgreSQL (DATABASE_URL)" : `embedded (${process.env.PGLITE_DIR || ".data/pglite"})`}`);
  switch (cmd) {
    case "migrate":
      console.log("Schema applied.");
      break;
    case "seed": {
      const n = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM users");
      if (n && n.n > 0) throw new Error("The database already has users. Seeding only runs on an empty database (use db:reset for presentation environments).");
      await seedDatabase(db);
      console.log("Synthetic presentation data loaded.");
      break;
    }
    case "reset":
      if (process.env.APP_ENV === "production") throw new Error("Refusing to reset a production database.");
      await wipeDatabase(db);
      await seedDatabase(db);
      console.log("Database wiped and synthetic presentation data reloaded.");
      break;
    case "create-user": {
      const email = arg("email")?.toLowerCase();
      const name = arg("name");
      const role = arg("role") as Role | undefined;
      const studentId = arg("student") ? Number(arg("student")) : null;
      if (!email || !name || !role || !ROLES.includes(role)) {
        throw new Error(`Usage: npm run user:create -- --email x@y --name "Name" --role (${ROLES.join("|")}) [--student id]`);
      }
      if ((role === "student" || role === "parent") && !studentId) throw new Error("Student and parent accounts need --student <id>.");
      const password = process.env.NEW_USER_PASSWORD ?? (await promptHidden("Password (min 10 chars, letters and numbers): "));
      const problem = passwordProblem(password);
      if (problem) throw new Error(problem);
      await db.query("INSERT INTO users (email, name, role, password_hash, student_id) VALUES ($1,$2,$3,$4,$5)", [email, name, role, await hashPassword(password), studentId]);
      await db.query("INSERT INTO audit_log (action, entity, detail) VALUES ('user.create_cli', 'user', $1)", [JSON.stringify({ email, role })]);
      console.log(`Created ${role} account for ${email}.`);
      break;
    }
    default:
      throw new Error("Commands: migrate | seed | reset | create-user");
  }
  await db.close();
}

main().catch((e) => {
  console.error(`Error: ${(e as Error).message}`);
  process.exit(1);
});
