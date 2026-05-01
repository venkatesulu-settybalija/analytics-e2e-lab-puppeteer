import { expect } from "@jest/globals";
import { env } from "../config/env.js";

export async function resetLabState(): Promise<void> {
  const res = await fetch(`${env.BASE_URL}/api/__reset`, { method: "POST" });
  expect(res.status).toBe(204);
}
