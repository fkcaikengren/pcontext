export interface HttpResponse {
  code: number;
  errMsg?: string;
  data?: Record<string, any>;
}