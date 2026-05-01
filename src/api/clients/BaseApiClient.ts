export class BaseApiClient {
  constructor(protected readonly token: string) {}

  protected headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }
}
