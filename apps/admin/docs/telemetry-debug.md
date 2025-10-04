# Telemetry Debug Tools

This document describes the telemetry development tools available in the admin interface.

## Overview

The telemetry debug tools provide a way to test and validate telemetry event submission during development. These tools are only available in development mode and include:

1. **Hidden Debug Toggle** - A secret way to access debug tools
2. **Telemetry Debug Panel** - A UI for testing telemetry event submission
3. **Graceful Error Handling** - Robust error handling that won't break the user experience

## Accessing Debug Tools

### Method 1: Keyboard Shortcut
- Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to toggle the debug panel

### Method 2: Secret Click Sequence
- Click on the logo area (top-left corner) 5 times within 3 seconds
- The debug tools panel will appear in the bottom-right corner

## Using the Telemetry Debug Panel

Once the debug tools are visible, click "Telemetry Debug" to open the telemetry testing panel.

### Quick Tests
The panel includes pre-configured quick test buttons:
- **Page View** - Simulates a page view event
- **User Action** - Simulates a user interaction event  
- **Error Event** - Simulates an error tracking event

### Manual Event Creation
You can also create custom events by filling out the form:

- **Event Type** (required) - The type of event (e.g., 'page_view', 'user_action')
- **User ID** (optional) - Identifier for the user
- **Session ID** (optional) - Auto-generated if not provided
- **Properties** (optional) - JSON object with additional event data

### Example Event
```json
{
  "eventType": "feature_usage",
  "userId": "admin_123",
  "sessionId": "session_1234567890",
  "properties": {
    "feature": "menu_management",
    "action": "create_item",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

## Error Handling

The telemetry system is designed with graceful error handling:

- **Network Failures** - Logged to console but don't break the UI
- **Validation Errors** - Displayed in the debug panel with specific messages
- **JSON Parsing Errors** - Caught and displayed with helpful error messages
- **API Errors** - Server errors are displayed in the debug panel

## Integration with Application Code

### Using the Telemetry Hook

```typescript
import { useTelemetry } from '@/app/hooks/useTelemetry';

function MyComponent() {
  const { trackPageView, trackUserAction, trackError } = useTelemetry('user123');

  useEffect(() => {
    trackPageView('/my-page');
  }, []);

  const handleClick = () => {
    trackUserAction('button_click', 'my_component');
  };

  // Error handling
  try {
    // some operation
  } catch (error) {
    trackError(error, 'my_component_operation');
  }
}
```

### Using Telemetry Utilities Directly

```typescript
import { TelemetryHelpers, submitTelemetryEvent } from '@/lib/telemetry';

// Fire and forget
TelemetryHelpers.trackPageView('/dashboard', 'user123');

// With result handling
const success = await submitTelemetryEvent({
  eventType: 'custom_event',
  userId: 'user123',
  properties: { custom: 'data' }
});

if (!success) {
  console.log('Telemetry submission failed, but app continues normally');
}
```

## Development Notes

- Debug tools are only available when `NODE_ENV === 'development'`
- All telemetry submissions fail gracefully - they never throw errors that could break the user experience
- Console warnings are used for debugging but don't affect application functionality
- The debug panel provides immediate feedback on submission success/failure
- Session IDs are automatically generated for tracking user sessions

## Testing

The telemetry system includes comprehensive tests:

```bash
# Run telemetry tests
npm test -- --testPathPattern="telemetry|TelemetryDebug"
```

Tests cover:
- Successful event submission
- Error handling scenarios
- JSON validation
- UI interactions
- Graceful failure modes

## Future Enhancements

When the telemetry backend (Task 7) is implemented, these tools will:
- Actually submit events to the database
- Provide real-time feedback on event processing
- Allow testing of feature flags and experiments
- Enable validation of the complete telemetry pipeline