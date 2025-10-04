export interface CreateTelemetryEventDto {
  eventType: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: string;
}