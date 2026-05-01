import { readdirSync } from "node:fs";
import type { Page } from "puppeteer";

export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true });
  await page.$eval(
    selector,
    (el, v) => {
      const input = el as HTMLInputElement;
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}

export async function waitForTextContaining(
  page: Page,
  selector: string,
  substring: string,
  timeout = 30_000,
): Promise<void> {
  await page.waitForFunction(
    (sel, sub) => {
      const el = document.querySelector(sel);
      return Boolean(el?.textContent?.includes(sub));
    },
    { timeout },
    selector,
    substring,
  );
}

export async function waitForTextNot(
  page: Page,
  selector: string,
  forbidden: string,
  timeout = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const text = await page.$eval(selector, (el) => (el.textContent ?? "").trim());
      if (text !== forbidden) return;
    } catch {
      /* selector may be missing briefly */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timed out waiting for ${selector} text to not be "${forbidden}"`);
}

export async function waitForDownloadCsv(
  dir: string,
  timeout = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const names = readdirSync(dir).filter((f) => f.endsWith(".csv"));
      if (names.length > 0) return names[0]!;
    } catch {
      /* dir may not exist yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Timed out waiting for CSV download");
}
