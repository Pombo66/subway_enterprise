# BFF Background Worker Migration

## Problem Solved
Next.js API routes have a 5-minute execution timeout, causing long-running GPT-5 expansion jobs to fail with `HeadersTimeoutError`.

## Solution
Moved job processing from Next.js (timeout-limited) to BFF (no timeout limits).

## Architecture Change

### Before
```
User → Next.js API Route → Creates job → Processes in background (5-min timeout) ❌
                                      ↓
                                   Times out
```

### After
```
User → Next.js API Route → Creates job → Returns 202 immediately ✅
                              ↓
                         BFF Worker (polls every 5s) → Processes job (no timeout) ✅
```

## Changes Made

### 1. New BFF Background Worker (`apps/bff/src/services/expansion-job-worker.service.ts`)
- Polls database every 5 seconds for queued jobs
- Processes jobs using existing expansion service
- No timeout limits (runs in long-lived BFF process)
- Automatic startup/shutdown with BFF lifecycle
- Comprehensive logging

### 2. BFF Module Updated (`apps/bff/src/module.ts`)
- Registered `ExpansionJobWorkerService` as provider
- Worker starts automatically when BFF boots

### 3. Next.js API Route Simplified (`apps/admin/app/api/expansion/generate/route.ts`)
- Removed background processing call
- Just creates job and returns 202
- Job picked up by BFF worker

### 4. Job Service Updated (`apps/admin/lib/services/expansion-job.service.ts`)
- Removed `processJobAsync()` call from `createJob()`
- Deprecated old processing method (kept for reference)
- Clean separation of concerns

## Benefits

✅ **No Timeout Limits** - GPT-5 can take 10+ minutes without issues
✅ **Better Architecture** - Separation of HTTP handling (Next.js) and heavy processing (BFF)
✅ **More Reliable** - BFF is a stable, long-running process
✅ **Scalable** - Can add more workers or distribute across instances later
✅ **Same Performance** - Max 5-second delay before job starts (negligible)
✅ **Zero Breaking Changes** - Frontend unchanged, API contract unchanged

## How It Works

1. **User clicks "Generate"**
   - Frontend calls `/api/expansion/generate`

2. **Next.js creates job**
   - Validates parameters
   - Creates job record with `status: 'queued'`
   - Returns 202 with job ID immediately

3. **BFF worker picks up job**
   - Polls database every 5 seconds
   - Finds oldest queued job
   - Updates status to `processing`
   - Runs expansion generation (no timeout)
   - Updates job with results or error

4. **Frontend polls for completion**
   - Calls `/api/expansion/jobs/{id}` every 5 seconds
   - Gets status updates
   - Receives results when complete

## Testing

### Development
1. Restart BFF: `pnpm dev` (worker starts automatically)
2. Generate expansion with GPT-5 and 100 suggestions
3. Watch BFF logs for worker activity:
   ```
   🚀 Expansion Job Worker starting...
   ✅ Worker polling started (every 5000ms)
   📋 Processing job cmh...
   🎯 Job cmh...: Starting expansion generation
   ✅ Job cmh...: Completed successfully
   ```

### Production
- Worker runs automatically when BFF starts
- No configuration needed
- Graceful shutdown on BFF stop

## Monitoring

Worker logs include:
- Job pickup and processing start
- Model and parameters used
- Processing time and token usage
- Success/failure status
- Detailed error messages

Example log output:
```
📋 Processing job cmhrt93qw000080a8n86dih5x...
🎯 Job cmhrt93qw000080a8n86dih5x: Starting expansion generation
   Region: Germany
   Aggression: 25
   Model: gpt-5
✅ Job cmhrt93qw000080a8n86dih5x: Completed successfully
   Suggestions: 100
   Processing time: 342s
   Tokens used: 28088
   Cost: £0.0156
```

## Rollback Plan

If issues arise, the old code is still in the codebase (marked as `_DEPRECATED`). To rollback:

1. Uncomment the `processJobAsync()` call in `createJob()`
2. Remove `ExpansionJobWorkerService` from BFF module
3. Restart services

## Performance Impact

- **Job pickup delay**: 0-5 seconds (polling interval)
- **Processing time**: Unchanged (same GPT calls)
- **Total time**: Essentially the same
- **User experience**: Identical (already polling for status)

## Future Enhancements

- Add multiple workers for parallel processing
- Implement priority queues
- Add job retry logic
- Metrics and monitoring dashboard
- Distributed workers across multiple BFF instances
