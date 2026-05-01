import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export default async function globalTeardown() {
  if (process.env.REUSE_TEST_SERVER === "1") return;

  const pidFile = join(process.cwd(), ".jest-server-pid.txt");
  if (!existsSync(pidFile)) return;

  try {
    const pid = Number(readFileSync(pidFile, "utf8"));
    if (Number.isFinite(pid) && pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* ignore */
      }
      await sleep(1500);
      if (isRunning(pid)) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* ignore */
        }
      }
    }
    unlinkSync(pidFile);
  } catch {
    /* ignore */
  }
}
