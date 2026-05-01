import { expect } from "@jest/globals";
import type { Page } from "puppeteer";
import { env } from "../../config/env.js";
import { waitForTextNot } from "../puppeteer-utils.js";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(new URL("/dashboard.html", env.BASE_URL).href);
  }

  async expectLoaded(expectedTrendPoints: readonly number[]) {
    await waitForTextNot(this.page, '[data-testid="kpi-active-feeds"]', "-");
    await waitForTextNot(this.page, '[data-testid="kpi-total-events"]', "-");

    const deadline = Date.now() + 30_000;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const count = await this.page.$$eval('[data-testid="trend-chart"] .bar', (els) => els.length);
        if (count !== expectedTrendPoints.length) {
          await new Promise((r) => setTimeout(r, 100));
          continue;
        }
        for (let i = 0; i < expectedTrendPoints.length; i++) {
          const attr = await this.page.$eval(`[data-testid="trend-bar-${i}"]`, (el) =>
            el.getAttribute("data-value"),
          );
          expect(attr).toBe(String(expectedTrendPoints[i]));
        }
        return;
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Timed out waiting for trend chart to match API");
  }

  async selectTimeWindowDays(days: number) {
    await this.page.select('[data-testid="dash-days"]', String(days));
  }

  async selectGranularity(granularity: "day" | "week") {
    await this.page.select('[data-testid="dash-granularity"]', granularity);
  }

  async selectViz(viz: "bar" | "line") {
    await this.page.select('[data-testid="dash-viz"]', viz);
  }

  async clickDownloadCsv() {
    await this.page.waitForSelector('[data-testid="dashboard-download-csv"]', { visible: true });
    await this.page.click('[data-testid="dashboard-download-csv"]');
  }

  async expectKpisMatchTotals(activeFeeds: number, totalEvents: number) {
    const af = await this.page.$eval('[data-testid="kpi-active-feeds"]', (el) =>
      (el.textContent ?? "").trim(),
    );
    const te = await this.page.$eval('[data-testid="kpi-total-events"]', (el) =>
      (el.textContent ?? "").trim(),
    );
    expect(af).toBe(String(activeFeeds));
    expect(te).toBe(String(totalEvents));
  }

  get presetName() {
    return {
      fill: (value: string) => fillDashboardPresetName(this.page, value),
    };
  }

  get presetSave() {
    return {
      click: () => this.page.click('[data-testid="dashboard-preset-save"]'),
    };
  }

  get presetSelect() {
    return {
      selectOption: (name: string) => this.page.select('[data-testid="dashboard-preset-select"]', name),
    };
  }

  get presetLoad() {
    return {
      click: () => this.page.click('[data-testid="dashboard-preset-load"]'),
    };
  }

  get presetError() {
    return {
      expectHidden: () =>
        this.page.waitForSelector('[data-testid="dashboard-preset-error"]', { hidden: true }),
    };
  }

  get daysSelect() {
    return {
      expectValue: async (value: string) => {
        const v = await this.page.$eval('[data-testid="dash-days"]', (el) => (el as HTMLSelectElement).value);
        expect(v).toBe(value);
      },
    };
  }

  get granularitySelect() {
    return {
      expectValue: async (value: string) => {
        const v = await this.page.$eval('[data-testid="dash-granularity"]', (el) => (el as HTMLSelectElement).value);
        expect(v).toBe(value);
      },
    };
  }

  get downloadCsv() {
    return {
      click: () => this.clickDownloadCsv(),
    };
  }

}

async function fillDashboardPresetName(page: Page, value: string) {
  await page.waitForSelector('[data-testid="dashboard-preset-name"]', { visible: true });
  await page.$eval(
    '[data-testid="dashboard-preset-name"]',
    (el, v) => {
      const input = el as HTMLInputElement;
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    value,
  );
}
