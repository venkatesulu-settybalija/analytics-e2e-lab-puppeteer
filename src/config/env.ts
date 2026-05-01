const appPort = process.env.APP_PORT ?? "3100";

export const env = {
  BASE_URL: process.env.BASE_URL ?? `http://127.0.0.1:${appPort}`,
  USER: process.env.APP_USER ?? "demo",
  PASS: process.env.APP_PASS ?? "demo123",
  VIEWER_USER: process.env.APP_VIEWER_USER ?? "viewer",
  VIEWER_PASS: process.env.APP_VIEWER_PASS ?? "viewer123",
};
