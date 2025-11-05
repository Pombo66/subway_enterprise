interface ExpansionGeneratedEvent {
  event_type: 'expansion_generated';
  user_id: string;
  session_id: string;
  metadata: {
    region: string;
    aggression: number;
    suggestion_count: number;
    generation_time_ms: number;
    avg_confidence: number;
  };
}

interface ScenarioSavedEvent {
  event_type: 'scenario_saved';
  user_id: string;
  session_id: string;
  metadata: {
    scenario_id: string;
    label: string;
    suggestion_count: number;
  };
}

interface SuggestionApprovedEvent {
  event_type: 'suggestion_approved';
  user_id: string;
  session_id: string;
  metadata: {
    suggestion_id: string;
    scenario_id: string;
    confidence: number;
    band: string;
  };
}

type ExpansionTelemetryEvent = ExpansionGeneratedEvent | ScenarioSavedEvent | SuggestionApprovedEvent;

export class ExpansionTelemetry {
  private static sessionId: string = '';

  static initSession(): void {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getSessionId(): string {
    if (!this.sessionId) {
      this.initSession();
    }
    return this.sessionId;
  }

  static async trackEvent(event: ExpansionTelemetryEvent): Promise<void> {
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to track telemetry event:', error);
    }
  }

  static trackExpansionGenerated(
    userId: string,
    metadata: ExpansionGeneratedEvent['metadata']
  ): void {
    this.trackEvent({
      event_type: 'expansion_generated',
      user_id: userId,
      session_id: this.getSessionId(),
      metadata
    });
  }

  static trackScenarioSaved(
    userId: string,
    metadata: ScenarioSavedEvent['metadata']
  ): void {
    this.trackEvent({
      event_type: 'scenario_saved',
      user_id: userId,
      session_id: this.getSessionId(),
      metadata
    });
  }

  static trackSuggestionApproved(
    userId: string,
    metadata: SuggestionApprovedEvent['metadata']
  ): void {
    this.trackEvent({
      event_type: 'suggestion_approved',
      user_id: userId,
      session_id: this.getSessionId(),
      metadata
    });
  }
}
