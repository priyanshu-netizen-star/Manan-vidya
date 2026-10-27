/**
 * Grid-robot simulator for the robotics module. Students program a virtual robot with a tiny
 * command language before working with physical kits (hardware is outside the proposed fee).
 *
 *   forward 2      move forward 2 squares (default 1)
 *   left / right   turn 90 degrees
 *   repeat 3 { forward  right }
 *   # comments
 */

export type Dir = "N" | "E" | "S" | "W";
export type RobotSpec = { grid: string[]; start: { x: number; y: number; dir: Dir }; maxSteps?: number };
export type RobotState = { x: number; y: number; dir: Dir };
export type RobotRun = {
  path: RobotState[];
  reachedGoal: boolean;
  error: string | null;
};

type Cmd =
  | { op: "forward"; n: number; line: number }
  | { op: "left"; line: number }
  | { op: "right"; line: number }
  | { op: "repeat"; n: number; body: Cmd[]; line: number };

const DIRS: Dir[] = ["N", "E", "S", "W"];
const DELTA: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

export function parseRobotProgram(src: string): Cmd[] {
  const tokens: { t: string; line: number }[] = [];
  src.split("\n").forEach((raw, i) => {
    const line = raw.replace(/#.*/, "");
    for (const t of line.replace(/([{}])/g, " $1 ").split(/\s+/).filter(Boolean)) tokens.push({ t: t.toLowerCase(), line: i + 1 });
  });
  let pos = 0;
  const block = (inRepeat: boolean): Cmd[] => {
    const out: Cmd[] = [];
    while (pos < tokens.length) {
      const { t, line } = tokens[pos];
      if (t === "}") {
        if (!inRepeat) throw new Error(`Line ${line}: unexpected "}"`);
        pos++;
        return out;
      }
      pos++;
      if (t === "forward" || t === "fd") {
        const next = tokens[pos];
        let n = 1;
        if (next && /^\d+$/.test(next.t)) {
          n = Number(next.t);
          pos++;
        }
        if (n < 1 || n > 20) throw new Error(`Line ${line}: forward needs a number from 1 to 20`);
        out.push({ op: "forward", n, line });
      } else if (t === "left") {
        out.push({ op: "left", line });
      } else if (t === "right") {
        out.push({ op: "right", line });
      } else if (t === "repeat") {
        const n = tokens[pos];
        if (!n || !/^\d+$/.test(n.t)) throw new Error(`Line ${line}: repeat needs a number, e.g. repeat 4 { forward }`);
        pos++;
        if (tokens[pos]?.t !== "{") throw new Error(`Line ${line}: repeat ${n.t} must be followed by {`);
        pos++;
        const count = Number(n.t);
        if (count < 1 || count > 50) throw new Error(`Line ${line}: repeat count must be between 1 and 50`);
        out.push({ op: "repeat", n: count, body: block(true), line });
      } else {
        throw new Error(`Line ${line}: unknown command "${t}". Use forward, left, right or repeat.`);
      }
    }
    if (inRepeat) throw new Error('Missing "}" to close a repeat block');
    return out;
  };
  return block(false);
}

export function findGoal(grid: string[]) {
  for (let y = 0; y < grid.length; y++) {
    const x = grid[y].indexOf("G");
    if (x >= 0) return { x, y };
  }
  return null;
}

export function runRobot(spec: RobotSpec, src: string): RobotRun {
  const path: RobotState[] = [{ ...spec.start }];
  const goal = findGoal(spec.grid);
  let state: RobotState = { ...spec.start };
  let steps = 0;
  const maxSteps = spec.maxSteps ?? 200;
  let program: Cmd[];
  try {
    program = parseRobotProgram(src);
  } catch (e) {
    return { path, reachedGoal: false, error: (e as Error).message };
  }
  const exec = (cmds: Cmd[]) => {
    for (const c of cmds) {
      if (c.op === "repeat") {
        for (let i = 0; i < c.n; i++) exec(c.body);
      } else if (c.op === "left" || c.op === "right") {
        const i = DIRS.indexOf(state.dir);
        state = { ...state, dir: DIRS[(i + (c.op === "right" ? 1 : 3)) % 4] };
        path.push(state);
      } else if (c.op === "forward") {
        for (let i = 0; i < c.n; i++) {
          if (++steps > maxSteps) throw new Error("The robot used too many steps. Look for a shorter route.");
          const [dx, dy] = DELTA[state.dir];
          const nx = state.x + dx;
          const ny = state.y + dy;
          const cell = spec.grid[ny]?.[nx];
          if (cell === undefined) throw new Error(`Line ${c.line}: the robot would leave the board.`);
          if (cell === "#") throw new Error(`Line ${c.line}: the robot bumped into a wall.`);
          state = { ...state, x: nx, y: ny };
          path.push(state);
        }
      }
    }
  };
  try {
    exec(program);
  } catch (e) {
    return { path, reachedGoal: false, error: (e as Error).message };
  }
  const reachedGoal = !!goal && state.x === goal.x && state.y === goal.y;
  return { path, reachedGoal, error: null };
}
