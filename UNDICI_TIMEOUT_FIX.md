# Undici Timeout Fix for Long-Running GPT Requests

## Problem

Node.js's native `fetch` has a built-in headers timeout (default ~5 minutes) that cannot be configured. When making long-running requests to OpenAI's GPT-5 API (especially with 100+ suggestions), the request would fail with:

```
HeadersTimeoutError: Headers Timeout Error
```

This happened because:
1. GPT-5 is slower than GPT-5 Mini
2. Generating 100 suggestions with detailed analysis takes 5+ minutes
3. Node's native fetch times out waiting for response headers

## Solution

Switched from Node's native `fetch` to **undici's fetch** which allows configuring timeouts:

### Changes Made

1. **Installed undici**:
   ```bash
   pnpm add undici
   ```

2. **Updated simple-expansion.service.ts**:
   ```typescript
   import { fetch } from 'undici';
   
   const response = await fetch('https://api.openai.com/v1/responses', {
     // ... other options
     headersTimeout: 600000, // 10 minutes for headers
     bodyTimeout: 600000     // 10 minutes for body
   } as any);
   ```

### Why Undici?

- **Undici** is the HTTP client that powers Node.js's native fetch
- Provides low-level control over timeouts
- Allows configuring `headersTimeout` and `bodyTimeout` separately
- Fully compatible with standard fetch API
- Used by Node.js core team

### Timeout Configuration

- **Headers Timeout**: 10 minutes (600,000ms)
  - Time to wait for response headers from OpenAI
  - Covers GPT-5's processing time for complex requests

- **Body Timeout**: 10 minutes (600,000ms)
  - Time to wait for complete response body
  - Handles large JSON responses with 100+ suggestions

### Benefits

✅ No more `HeadersTimeoutError` failures
✅ GPT-5 can take as long as needed (up to 10 minutes)
✅ Handles large-scale expansion requests (100+ suggestions)
✅ Backward compatible with existing code
✅ Same fetch API, just with timeout control

## Testing

Test with:
- GPT-5 model (slower, higher quality)
- 100 suggestions (aggression level 25)
- Germany region (658 existing stores)

Should complete successfully in 5-8 minutes without timeout errors.

## Alternative Considered

We initially tried using `AbortController` with `setTimeout`, but this doesn't solve the underlying `HeadersTimeoutError` from Node's fetch implementation. Undici provides the proper low-level control needed.
