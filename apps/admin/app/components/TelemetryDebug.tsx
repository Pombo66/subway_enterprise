'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  submitTelemetryEvent, 
  generateSessionId, 
  TelemetryEventTypes,
  type TelemetryEvent 
} from '@/lib/telemetry';

interface TelemetryDebugProps {
  isVisible: boolean;
  onClose: () => void;
}

// Form field component for better reusability
interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'textarea';
  rows?: number;
}

function FormField({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  type = 'text',
  rows = 1 
}: FormFieldProps) {
  const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const textareaClasses = `${baseClasses} font-mono text-sm`;
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label} {required && '*'}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={textareaClasses}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClasses}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

// Result display component
interface ResultDisplayProps {
  result: { success: boolean; message: string } | null;
}

function ResultDisplay({ result }: ResultDisplayProps) {
  if (!result) return null;

  return (
    <div
      className={`p-3 rounded-md ${
        result.success
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}
    >
      <div className="font-medium">
        {result.success ? '✓ Success' : '✗ Error'}
      </div>
      <div className="text-sm mt-1">{result.message}</div>
    </div>
  );
}

// Custom hook for telemetry debug form state
function useTelemetryDebugForm() {
  const [formData, setFormData] = useState({
    eventType: 'test_event',
    userId: '',
    sessionId: '',
    properties: '{}'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateField = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      eventType: 'test_event',
      userId: '',
      sessionId: '',
      properties: '{}'
    });
    setLastResult(null);
  }, []);

  return {
    formData,
    updateField,
    resetForm,
    submission: { isSubmitting, setIsSubmitting, lastResult, setLastResult },
  };
}

export default function TelemetryDebug({ isVisible, onClose }: TelemetryDebugProps) {
  const { formData, updateField, resetForm, submission } = useTelemetryDebugForm();
  const { eventType, userId, sessionId, properties } = formData;
  const { isSubmitting, setIsSubmitting, lastResult, setLastResult } = submission;

  // Generate a session ID on mount using the utility function
  useEffect(() => {
    if (!sessionId) {
      updateField('sessionId', `debug_${generateSessionId()}`);
    }
  }, [sessionId, updateField]);

  // Event submission function
  const submitEvent = useCallback(async (eventData: typeof formData) => {
    try {
      const parsedProperties = parsePropertiesJson(eventData.properties);
      
      const event: TelemetryEvent = {
        eventType: eventData.eventType,
        userId: eventData.userId || undefined,
        sessionId: eventData.sessionId || undefined,
        properties: parsedProperties,
      };

      const success = await submitTelemetryEvent(event);
      return {
        success,
        message: success ? 'Event submitted successfully' : 'Failed to submit event'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit telemetry event';
      return { success: false, message: errorMessage };
    }
  }, []);

  const handleSubmitEvent = async () => {
    setIsSubmitting(true);
    setLastResult(null);

    const result = await submitEvent(formData);
    setLastResult(result);
    setIsSubmitting(false);
  };

  // Extract JSON parsing logic
  const parsePropertiesJson = (jsonString: string): Record<string, any> | undefined => {
    if (!jsonString.trim()) return undefined;
    
    try {
      const parsed = JSON.parse(jsonString);
      return Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch (e) {
      throw new Error('Invalid JSON in properties field');
    }
  };

  // Factory pattern for test events
  const createTestEvent = useCallback((type: 'page_view' | 'user_action' | 'error_event') => {
    const timestamp = new Date().toISOString();
    
    const eventFactories = {
      page_view: () => ({
        eventType: TelemetryEventTypes.PAGE_VIEW,
        properties: { page: '/dashboard', timestamp },
      }),
      user_action: () => ({
        eventType: TelemetryEventTypes.USER_ACTION,
        properties: { action: 'button_click', component: 'debug_panel', timestamp },
      }),
      error_event: () => ({
        eventType: TelemetryEventTypes.ERROR,
        properties: { error_type: 'test_error', message: 'This is a test error', timestamp },
      }),
    } as const;

    return eventFactories[type]();
  }, []);

  const handleQuickTest = (testType: 'page_view' | 'user_action' | 'error_event') => {
    const testEvent = createTestEvent(testType);
    updateField('eventType', testEvent.eventType);
    updateField('properties', JSON.stringify(testEvent.properties, null, 2));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Telemetry Debug Panel</h2>
          <button 
            onClick={onClose}
            className="s-btn s-btn--sm text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Quick Test Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Tests:</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleQuickTest('page_view')}
                className="s-btn s-btn--sm px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
              >
                Page View
              </button>
              <button
                onClick={() => handleQuickTest('user_action')}
                className="s-btn s-btn--sm px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                User Action
              </button>
              <button
                onClick={() => handleQuickTest('error_event')}
                className="s-btn s-btn--sm px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
              >
                Error Event
              </button>
            </div>
          </div>

          <FormField
            id="eventType"
            label="Event Type"
            value={eventType}
            onChange={(value) => updateField('eventType', value)}
            placeholder="e.g., page_view, user_action, error"
            required
          />

          <FormField
            id="userId"
            label="User ID (optional)"
            value={userId}
            onChange={(value) => updateField('userId', value)}
            placeholder="e.g., user_123"
          />

          <FormField
            id="sessionId"
            label="Session ID (optional)"
            value={sessionId}
            onChange={(value) => updateField('sessionId', value)}
            placeholder="Auto-generated if empty"
          />

          <FormField
            id="properties"
            label="Properties (JSON)"
            value={properties}
            onChange={(value) => updateField('properties', value)}
            placeholder='{"key": "value", "timestamp": "2023-01-01T00:00:00Z"}'
            type="textarea"
            rows={4}
          />

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmitEvent}
              disabled={isSubmitting || !eventType.trim()}
              className="s-btn s-btn--md px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Event'}
            </button>
            <button
              onClick={resetForm}
              className="s-btn s-btn--sm px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
            >
              Reset
            </button>
          </div>

          <ResultDisplay result={lastResult} />

          {/* Help Text */}
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Development Tool:</strong> This panel allows you to test telemetry event submission.
            Events are sent to the BFF telemetry endpoint. If the telemetry system is not yet implemented,
            you&apos;ll see connection errors, which is expected during development.
          </div>
        </div>
      </div>
    </div>
  );
}