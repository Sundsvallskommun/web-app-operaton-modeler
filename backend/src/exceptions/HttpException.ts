export class HttpException extends Error {
  public readonly status: number;
  public readonly detail: string | undefined;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}
