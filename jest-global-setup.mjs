import { spawn } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import waitOn from "wait-on";

const pidFile = join(process.cwd(), ".jest-server-pid.txt");

function resolveDemoCli() {
  return join(
    process.cwd(),
    "node_modules",
    "@venkatesulu-settybalija",
    "analytics-demo-app",
    "dist",
    "cli.js",
  );
}

export default async function globalSetup() {
  const appPort = process.env.APP_PORT ?? "3100";
  const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${appPort}`;

  if (process.env.REUSE_TEST_SERVER === "1") {
    await waitOn({ resources: [baseURL], timeout: 5000 }).catch(() => {});
    return;
  }

  if (existsSync(pidFile)) {
    try {
      unlinkSync(pidFile);
    } catch {
      /* ignore */
    }
  }

  const cliJs = resolveDemoCli();
  const child = spawn(process.execPath, [cliJs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_ENABLE_RESET: "true",
      APP_PORT: appPort,
      BASE_URL: baseURL,
    },
    stdio: "inherit",
    detached: false,
  });

  writeFileSync(pidFile, String(child.pid));
  await waitOn({ resources: [baseURL], timeout: 120_000 });
}
