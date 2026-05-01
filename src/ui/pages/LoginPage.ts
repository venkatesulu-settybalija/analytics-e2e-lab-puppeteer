import type { Page } from "puppeteer";
import { env } from "../../config/env.js";
import { fillInput, waitForTextContaining } from "../puppeteer-utils.js";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(new URL("/", env.BASE_URL).href);
  }

  async login(username: string, password: string) {
    await fillInput(this.page, "#username", username);
    await fillInput(this.page, "#password", password);
    await this.page.waitForSelector("#login-btn", { visible: true });
    await this.page.click("#login-btn");
    await waitForTextContaining(this.page, '[data-testid="login-status"]', "Login success");
  }
}
