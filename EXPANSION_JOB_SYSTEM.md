# Expansion Job System

## Overview

The expansion job system prevents expensive OpenAI charges when network interruptions occur during expansion generation. It implements an asynchronous job pattern with idempotency to ensure LLM calls are never duplicated.

## Problem Solved

**Before**: When `ERR_NETWORK_IO_SUSPENDED` occurred (Chrome/Edge network pause), the client would disconnect but the server would continue processing and calling OpenAI, resulting in charges for "lost" results.

**After**: Jobs run asynchronously in the background. Network interruptions don't cause duplicate processing, and clients can resume polling when connectivity returns.

## Architecture

### 1. Job Creation (POST /api/expansion/generate)
- Validates parameters and estimates cost
- Requires `X-Idempotency-Key` header
- Returns `202 Accepted` with `jobId` immediately
- Starts background processing (doesn't wait)

### 2. Job Polling (GET /api/expansion/jobs/:jobId)
- Returns job status: `queued`, `running`, `completed`, `failed`
- Includes cost tracking and timing information
- Returns results when completed

### 3. Background Processing
- Runs the actual expansion generation
- Calls OpenAI APIs and processes results
- Updates job status and stores results
- Tracks actual token usage and costs

## Cost Protection

### Pre-flight Cost Estimation
```javascript
// Estimates tokens before any LLM calls
const estimate = {
  tokens: 1500,
  cost: 0.12  // £0.12
};

// Hard cap prevents expensive runs
if (estimate.cost > 2.00) {
  return 400; // Cost limit exceeded
}
```

### Idempotency Protection
```javascript
// Same key = same job, no duplicate processing
const idempotencyKey = crypto.randomUUID();
const { jobId, isReused } = await createJob(key, userId, params);
```

### Cache Integration
- Prisma client and cache layers still work
- Results are cached to prevent duplicate work
- Cache hits reduce token usage significantly

## Client Implementation

### Job Creation with Recovery
```javascript
const idempotencyKey = crypto.randomUUID();
const storageKey = ExpansionJobRecovery.storeJob(jobId, params);

const response = await fetch('/api/expansion/generate', {
  method: 'POST',
  headers: { 
    'X-Idempotency-Key': idempotencyKey 
  },
  body: JSON.stringify(params)
});

const { jobId } = await response.json();
```

### Resilient Polling
```javascript
const pollJobCompletion = async (jobId) => {
  while (attempts < maxAttempts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`/api/expansion/jobs/${jobId}`, {
        signal: controller.signal
      });
      
      const jobData = await response.json();
      
      if (jobData.status === 'completed') {
        return jobData.result;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      // Network error - wait longer and retry
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
};
```

### Recovery on Page Load
```javascript
useEffect(() => {
  const recoverableJobs = ExpansionJobRecovery.getRecoverableJobs();
  if (recoverableJobs.length > 0) {
    // Show notification to user about background jobs
    ExpansionJobRecovery.showRecoveryNotification(recoverableJobs);
  }
}, []);
```

## Database Schema

```sql
CREATE TABLE ExpansionJob (
  id TEXT PRIMARY KEY,
  idempotencyKey TEXT UNIQUE,
  status TEXT DEFAULT 'queued',
  userId TEXT,
  params TEXT,           -- JSON: GenerationParams
  result TEXT,           -- JSON: ExpansionResult
  error TEXT,
  tokenEstimate INTEGER,
  tokensUsed INTEGER,
  costEstimate REAL,
  actualCost REAL,
  startedAt DATETIME,
  completedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## UI Components

### Network Status Indicator
- Shows when connection is paused
- Reassures user that jobs continue in background

### Job Status Indicator
- Shows current job progress
- Displays job ID and cost estimate
- Persists during network interruptions

### Cost Guard (Future)
- Shows cost estimate before job creation
- Allows user to confirm high-cost operations
- Suggests alternatives (reduce aggression, disable AI)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/expansion/generate` | POST | Create job (202 response) |
| `/api/expansion/jobs/:jobId` | GET | Get job status |
| `/api/expansion/jobs/cleanup` | POST | Admin cleanup (24h+ old jobs) |

## Testing

Run the test script to verify the system:

```bash
node test-job-system.mjs
```

Tests:
- Job creation and idempotency
- Cost estimation accuracy
- Polling and completion
- Error handling

## Cost Savings

### Before (Synchronous)
- Network drop = lost £1.60 charge
- No duplicate protection
- No cost visibility

### After (Asynchronous + Idempotency)
- Network drop = job continues, client resumes
- Duplicate requests reuse same job
- Pre-flight cost estimation with caps
- Actual cost tracking

## Monitoring

### Logs
- Job creation and completion
- Token usage vs estimates
- Cost tracking
- Error rates

### Metrics to Track
- Job completion rate
- Average job duration
- Cost accuracy (estimate vs actual)
- Network interruption recovery rate

## Future Enhancements

1. **Job Queue with Concurrency Limits**
   - Prevent too many concurrent LLM calls
   - Queue jobs during high load

2. **Cost Budgets**
   - Daily/monthly spending limits per user
   - Team budget allocation

3. **Job Prioritization**
   - Premium users get faster processing
   - Background vs interactive jobs

4. **Advanced Recovery UI**
   - Show all user's jobs
   - Resume/cancel options
   - Job history and costs

5. **Webhook Notifications**
   - Email when expensive jobs complete
   - Slack integration for team notifications