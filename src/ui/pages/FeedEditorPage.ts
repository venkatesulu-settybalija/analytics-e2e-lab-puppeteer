import { expect } from "@jest/globals";
import type { Page } from "puppeteer";
import { env } from "../../config/env.js";
import { fillInput } from "../puppeteer-utils.js";

export class FeedEditorPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(new URL("/feed.html", env.BASE_URL).href);
  }

  enabledCell(id: string) {
    const sel = `[data-testid="feed-enabled-${id}"]`;
    return {
      innerText: () =>
        this.page.$eval(sel, (el) => (el as HTMLElement).innerText.trim()),
    };
  }

  sourceInput(id: string) {
    const sel = `[data-testid="feed-source-input-${id}"]`;
    return {
      fill: (value: string) => fillInput(this.page, sel, value),
    };
  }

  editError(id: string) {
    const sel = `[data-testid="feed-edit-error-${id}"]`;
    return {
      expectVisible: async () => {
        await this.page.waitForSelector(sel, { visible: true });
      },
      expectContainsText: async (sub: string) => {
        await this.page.waitForFunction(
          (s, t) => {
            const el = document.querySelector(s);
            return Boolean(el?.textContent?.includes(t));
          },
          {},
          sel,
          sub,
        );
      },
    };
  }

  toggle(id: string) {
    return `[data-testid="feed-toggle-${id}"]`;
  }

  saveSource(id: string) {
    const sel = `[data-testid="feed-save-${id}"]`;
    return {
      click: () => this.page.click(sel),
    };
  }

  async toggleFeed(id: string) {
    await this.page.click(this.toggle(id));
  }

  async submitNewFeed(source: string) {
    await fillInput(this.page, '[data-testid="new-feed-source-input"]', source);
    await this.page.click('[data-testid="new-feed-submit"]');
  }

  async expectAnyRowVisible() {
    await this.page.waitForSelector('tbody [data-testid^="feed-row-"]', { visible: true });
  }

  async expectEnabledCellTextChanges(id: string, before: string) {
    await this.page.waitForFunction(
      (feedId, prev) => {
        const el = document.querySelector(`[data-testid="feed-enabled-${feedId}"]`);
        return el !== null && (el.textContent ?? "").trim() !== prev;
      },
      { timeout: 15_000 },
      id,
      before,
    );
  }

  get formError() {
    const sel = '[data-testid="feed-form-error"]';
    return {
      expectVisible: () => this.page.waitForSelector(sel, { visible: true }),
      expectContainsText: (sub: string) =>
        this.page.waitForFunction(
          (s, t) => {
            const el = document.querySelector(s);
            return Boolean(el?.textContent?.includes(t));
          },
          {},
          sel,
          sub,
        ),
    };
  }

  get viewerBanner() {
    const sel = '[data-testid="viewer-readonly-banner"]';
    return {
      expectVisible: () => this.page.waitForSelector(sel, { visible: true }),
    };
  }

  get newSubmit() {
    const sel = '[data-testid="new-feed-submit"]';
    return {
      expectHidden: () => this.page.waitForSelector(sel, { hidden: true }),
    };
  }

  async expectToggleCount(id: string, count: number) {
    const handles = await this.page.$$(this.toggle(id));
    expect(handles.length).toBe(count);
  }
}
