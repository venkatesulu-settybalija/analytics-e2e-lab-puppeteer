import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { AnalyticsApi } from "../../src/api/clients/AnalyticsApi.js";
import { AuthApi } from "../../src/api/clients/AuthApi.js";
import { env } from "../../src/config/env.js";
import { resetLabState } from "../../src/fixtures/reset.js";

describe("Analytics API", () => {
  let analyticsApi: AnalyticsApi;
  let analyticsApiViewer: AnalyticsApi;

  beforeEach(async () => {
    const adminToken = await new AuthApi().loginToken(env.USER, env.PASS);
    analyticsApi = new AnalyticsApi(adminToken);
    const viewerToken = await new AuthApi().loginToken(env.VIEWER_USER, env.VIEWER_PASS);
    analyticsApiViewer = new AnalyticsApi(viewerToken);
  });

  afterEach(async () => {
    await resetLabState();
  });

  test("list feeds and toggle one item", async () => {
    const initial = await analyticsApi.listFeeds();
    expect(initial.items.length).toBeGreaterThan(0);

    const target = initial.items[0]!;
    const updated = await analyticsApi.toggleFeed(target.id, !target.enabled);
    expect(updated.enabled).toBe(!target.enabled);
  });

  test("dashboard summary matches feed state and trend shape", async () => {
    const feeds = await analyticsApi.listFeeds();
    const activeFeeds = feeds.items.filter((f) => f.enabled).length;
    const summary = await analyticsApi.dashboardSummary();
    expect(summary.kpis.activeFeeds).toBe(activeFeeds);
    expect(summary.kpis.totalEvents).toBe(activeFeeds * 120 + 80);
    expect(summary.trend).toHaveLength(7);
    expect(summary.timeRange.days).toBe(7);
    expect(summary.timeRange.granularity).toBe("day");
    expect(summary.timeRange.labels).toHaveLength(summary.trend.length);
  });

  test("dashboard summary accepts day windows beyond the default curve", async () => {
    const s14 = await analyticsApi.dashboardSummary({ days: 14 });
    expect(s14.trend).toHaveLength(14);
    expect(s14.timeRange.labels).toHaveLength(14);

    const s30w = await analyticsApi.dashboardSummary({ days: 30, granularity: "week" });
    expect(s30w.trend).toHaveLength(Math.ceil(30 / 7));
    expect(s30w.timeRange.granularity).toBe("week");
  });

  test("datasets catalogue lists physical and virtual entries", async () => {
    const ds = await analyticsApi.listDatasets();
    expect(ds.items.some((x) => x.id === "feeds" && x.kind === "physical")).toBe(true);
    expect(ds.items.some((x) => x.id === "events_daily" && x.kind === "virtual")).toBe(true);
  });

  test("SQL Lab runs read-only selects on feeds", async () => {
    const star = await analyticsApi.sqlLab("select * FROM feeds;");
    expect(star.rows.length).toBeGreaterThan(0);
    expect(star.columns.map((c) => c.name).sort()).toEqual(["enabled", "id", "source", "updatedAt"].sort());

    const count = await analyticsApi.sqlLab("SELECT count(*) FROM feeds");
    expect(count.rows[0]!.count).toBe(star.rows.length);

    await analyticsApiViewer.sqlLab("SELECT source FROM feeds");
  });

  test("SQL Lab rejects non-select statements", async () => {
    const res = await analyticsApi.sqlLabRaw("DELETE FROM feeds");
    expect(res.status).toBe(400);
  });

  test("create feed returns 201 and appears in list", async () => {
    const created = await analyticsApi.createFeed("shipments");
    expect(created.source).toBe("shipments");
    const list = await analyticsApi.listFeeds();
    expect(list.items.some((x) => x.id === created.id)).toBe(true);
  });

  test("create feed rejects empty source", async () => {
    const res = await analyticsApi.createFeedRaw("   ");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toContain("required");
  });

  test("create feed rejects duplicate source (case-insensitive)", async () => {
    const second = await analyticsApi.createFeedRaw("ORDERS");
    expect(second.status).toBe(400);
  });

  test("viewer can read feeds but cannot mutate", async () => {
    const list = await analyticsApiViewer.listFeeds();
    expect(list.items.length).toBeGreaterThan(0);

    const patch = await analyticsApiViewer.patchFeedRaw(list.items[0]!.id, { enabled: false });
    expect(patch.status).toBe(403);

    const post = await analyticsApiViewer.createFeedRaw("forbidden");
    expect(post.status).toBe(403);

    const adminList = await analyticsApi.listFeeds();
    expect(adminList.items.some((x) => x.source === "forbidden")).toBe(false);
  });

  test("login returns role for admin and viewer", async () => {
    const admin = await fetch(`${env.BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: env.USER, password: env.PASS }),
    });
    expect(admin.status).toBe(200);
    expect(((await admin.json()) as { role: string }).role).toBe("admin");

    const viewer = await fetch(`${env.BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: env.VIEWER_USER, password: env.VIEWER_PASS }),
    });
    expect(viewer.status).toBe(200);
    expect(((await viewer.json()) as { role: string }).role).toBe("viewer");
  });
});
