export interface CreateTelemetryEventDto {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}