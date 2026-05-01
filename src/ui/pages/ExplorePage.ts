import { expect } from "@jest/globals";
import type { Page } from "puppeteer";
import { env } from "../../config/env.js";
import { fillInput } from "../puppeteer-utils.js";

export class ExplorePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(new URL("/explore.html", env.BASE_URL).href);
  }

  async expectDatasetsVisible() {
    await this.page.waitForSelector('[data-testid="datasets-list"] [data-testid="dataset-feeds"]', {
      visible: true,
    });
    await this.page.waitForSelector('[data-testid="datasets-list"] [data-testid="dataset-events_daily"]', {
      visible: true,
    });
  }

  async runQuery(sql: string) {
    await fillInput(this.page, '[data-testid="sqllab-query"]', sql);
    await this.page.click('[data-testid="sqllab-run"]');
  }

  async expectResultCell(row: number, col: number, text: string) {
    const sel = `[data-testid="sqllab-cell-${row}-${col}"]`;
    await this.page.waitForSelector(sel, { visible: true });
    const cellText = await this.page.$eval(sel, (el) => (el.textContent ?? "").trim());
    expect(cellText).toBe(text);
  }

  async expectErrorHidden() {
    await this.page.waitForSelector('[data-testid="sqllab-error"]', { hidden: true });
  }
}
