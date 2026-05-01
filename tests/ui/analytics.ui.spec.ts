import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "@jest/globals";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { AnalyticsApi } from "../../src/api/clients/AnalyticsApi.js";
import { AuthApi } from "../../src/api/clients/AuthApi.js";
import { env } from "../../src/config/env.js";
import { resetLabState } from "../../src/fixtures/reset.js";
import { DashboardPage } from "../../src/ui/pages/DashboardPage.js";
import { ExplorePage } from "../../src/ui/pages/ExplorePage.js";
import { FeedEditorPage } from "../../src/ui/pages/FeedEditorPage.js";
import { LoginPage } from "../../src/ui/pages/LoginPage.js";
import { waitForDownloadCsv } from "../../src/ui/puppeteer-utils.js";

describe("Analytics UI", () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== "false",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  });

  afterAll(async () => {
    if (browser?.connected) {
      for (const p of await browser.pages()) {
        try {
          await p.close({ runBeforeUnload: false });
        } catch {
          /* ignore */
        }
      }
      await browser.close();
    }
  });

  let page: Page;
  let analyticsApi: AnalyticsApi;
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let feedPage: FeedEditorPage;
  let explorePage: ExplorePage;

  beforeEach(async () => {
    page = await browser.newPage();
    const token = await new AuthApi().loginToken(env.USER, env.PASS);
    analyticsApi = new AnalyticsApi(token);
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    feedPage = new FeedEditorPage(page);
    explorePage = new ExplorePage(page);
  });

  afterEach(async () => {
    await resetLabState();
    await page.close();
  });

  test("dashboard KPIs and chart align with API summary", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);

    const summary = await analyticsApi.dashboardSummary();
    await dashboardPage.goto();
    await dashboardPage.expectKpisMatchTotals(summary.kpis.activeFeeds, summary.kpis.totalEvents);
    await dashboardPage.expectLoaded(summary.trend);
  });

  test("dashboard time window adjusts bar count", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    await dashboardPage.goto();

    const wide = await analyticsApi.dashboardSummary({ days: 30 });
    await dashboardPage.selectTimeWindowDays(30);
    await dashboardPage.expectLoaded(wide.trend);
    expect(wide.timeRange.labels.at(0)).toContain("Day");
  });

  test("dashboard downloads CSV with KPI and series rows", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    const summary = await analyticsApi.dashboardSummary();
    await dashboardPage.goto();
    await dashboardPage.expectLoaded(summary.trend);

    const downloadDir = mkdtempSync(join(tmpdir(), "analytics-lab-dl-"));
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });

    try {
      const filePromise = waitForDownloadCsv(downloadDir);
      await dashboardPage.downloadCsv.click();
      const filename = await filePromise;
      expect(filename).toMatch(/analytics-lab-dashboard-.*\.csv$/);
      const text = readFileSync(join(downloadDir, filename), "utf8");
      expect(text).toContain("kind,name,value");
      expect(text).toContain(`kpi,active_feeds,${summary.kpis.activeFeeds}`);
      expect(text).toContain(`kpi,total_events,${summary.kpis.totalEvents}`);
      expect(text).toContain("series,");
    } finally {
      rmSync(downloadDir, { recursive: true, force: true });
    }
  });

  test("dashboard saves and loads a preset from localStorage", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    await dashboardPage.goto();
    await page.evaluate(() => localStorage.removeItem("analyticsLabDashboards"));

    await dashboardPage.selectTimeWindowDays(14);
    await dashboardPage.selectGranularity("week");
    await dashboardPage.selectViz("bar");
    await dashboardPage.presetName.fill("e2e-weekly");
    await dashboardPage.presetSave.click();
    await dashboardPage.presetError.expectHidden();

    await dashboardPage.selectTimeWindowDays(7);
    await dashboardPage.selectGranularity("day");
    await dashboardPage.daysSelect.expectValue("7");

    await dashboardPage.presetSelect.selectOption("e2e-weekly");
    await dashboardPage.presetLoad.click();
    await dashboardPage.presetError.expectHidden();

    await dashboardPage.daysSelect.expectValue("14");
    await dashboardPage.granularitySelect.expectValue("week");

    const expected = await analyticsApi.dashboardSummary({ days: 14, granularity: "week" });
    await dashboardPage.expectLoaded(expected.trend);
  });

  test("feed editor toggles a row", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);

    await feedPage.goto();
    await feedPage.expectAnyRowVisible();

    const before = await feedPage.enabledCell("feed-1").innerText();
    await feedPage.toggleFeed("feed-1");
    await feedPage.expectEnabledCellTextChanges("feed-1", before);
  });

  test("feed form shows validation for empty source", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    await feedPage.goto();
    await feedPage.submitNewFeed("   ");
    await feedPage.formError.expectVisible();
    await feedPage.formError.expectContainsText("required");
  });

  test("save source shows validation for duplicate name", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    await feedPage.goto();
    await feedPage.sourceInput("feed-2").fill("orders");
    await feedPage.saveSource("feed-2").click();
    await feedPage.editError("feed-2").expectVisible();
    await feedPage.editError("feed-2").expectContainsText("Duplicate");
  });

  test("explore renders datasets and SQL Lab results", async () => {
    await loginPage.goto();
    await loginPage.login(env.USER, env.PASS);
    await explorePage.goto();
    await explorePage.expectDatasetsVisible();

    await explorePage.runQuery("SELECT source, enabled FROM feeds");
    await explorePage.expectErrorHidden();
    await explorePage.expectResultCell(0, 0, "orders");
    await explorePage.expectResultCell(1, 0, "payments");
  });

  test("viewer sees readonly banner and no editor controls", async () => {
    await loginPage.goto();
    await loginPage.login(env.VIEWER_USER, env.VIEWER_PASS);
    await feedPage.goto();
    await feedPage.viewerBanner.expectVisible();
    await feedPage.newSubmit.expectHidden();
    await feedPage.expectToggleCount("feed-1", 0);
  });
});
