# Telemetry Debug Tooling

This document describes the development debug tooling for the telemetry system.

## Overview

The telemetry debug tooling provides developers with a way to test and validate telemetry event submission during development. It includes:

1. **Hidden Debug Toggle**: A development-only interface for accessing debug tools
2. **Test Event Emission**: Functionality to emit test telemetry events
3. **Graceful Error Handling**: Ensures telemetry failures don't affect user experience
4. **Validation Tools**: Helps validate event structure and submission

## Accessing Debug Tools

### Method 1: Keyboard Shortcut
- Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to toggle debug mode
- Only works in development environment (`NODE_ENV=development`)

### Method 2: Secret Click Sequence
- Click 5 times on the top-left corner of the page (logo area)
- Only works in development environment

### Method 3: Environment Variable
- Set `NEXT_PUBLIC_DEBUG_MODE=true` in your `.env.local` file
- Debug tools will be automatically available

## Using the Telemetry Debug Panel

Once debug mode is enabled:

1. Click the "Telemetry Debug" button in the debug tools panel
2. The debug panel will open with the following features:

### Quick Test Buttons
- **Page View**: Pre-fills a page view event
- **User Action**: Pre-fills a user action event  
- **Error Event**: Pre-fills an error event

### Manual Event Creation
- **Event Type**: Required field for the event type
- **User ID**: Optional user identifier
- **Session ID**: Auto-generated debug session ID
- **Properties**: JSON object with event properties

### Event Submission
- Click "Submit Event" to send the event to the telemetry endpoint
- Results are displayed with success/error status
- "Reset" button clears the form

## Error Handling

The telemetry system is designed to fail gracefully:

1. **Network Errors**: Logged to console, don't break user experience
2. **Validation Errors**: Displayed in debug panel for development
3. **Server Errors**: Handled gracefully with fallback behavior
4. **JSON Parsing Errors**: Validated before submission

## Environment Configuration

Add to your `apps/admin/.env.local`:

```bash
# Enable debug mode
NEXT_PUBLIC_DEBUG_MODE=true

# BFF endpoint (should already be configured)
NEXT_PUBLIC_BFF_URL=http://localhost:3001
```

## Testing Telemetry Events

### Example Test Events

**Page View Event:**
```json
{
  "eventType": "page_view",
  "userId": "user_123",
  "sessionId": "debug_session_abc",
  "properties": {
    "page": "/dashboard",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

**User Action Event:**
```json
{
  "eventType": "user_action", 
  "userId": "user_123",
  "sessionId": "debug_session_abc",
  "properties": {
    "action": "button_click",
    "component": "menu_item",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

**Error Event:**
```json
{
  "eventType": "error",
  "userId": "user_123", 
  "sessionId": "debug_session_abc",
  "properties": {
    "error": "Validation failed",
    "context": "menu_creation",
    "severity": "medium",
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

## Production Considerations

- Debug tools are automatically disabled in production
- Telemetry events continue to work normally in production
- Error handling ensures no user experience impact
- All debug-related code is tree-shaken in production builds

## Troubleshooting

### Debug Panel Not Appearing
1. Verify `NODE_ENV=development`
2. Check `NEXT_PUBLIC_DEBUG_MODE=true` in `.env.local`
3. Try the keyboard shortcut `Ctrl+Shift+D`

### Events Not Submitting
1. Check BFF is running on port 3001
2. Verify `NEXT_PUBLIC_BFF_URL` is correct
3. Check browser network tab for request details
4. Verify telemetry endpoint is implemented in BFF

### JSON Validation Errors
1. Use the quick test buttons for valid examples
2. Validate JSON syntax in properties field
3. Check console for detailed error messages

## API Endpoints

The debug tooling interacts with these BFF endpoints:

- `POST /telemetry` - Submit telemetry events
- `GET /feature-flags` - Retrieve feature flags
- `GET /feature-flags/:key` - Get specific feature flag

## Security Notes

- Debug tools are development-only
- No sensitive data should be included in test events
- Production builds automatically exclude debug code
- All telemetry data should follow privacy guidelines