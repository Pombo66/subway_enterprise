# Development Safety System

## 🛡️ Overview

This safety system prevents unauthorized OpenAI API costs during development. It implements multiple layers of protection to ensure you never accidentally incur charges.

## 🚀 Quick Start (Safe Development)

```bash
# Check if it's safe to develop
pnpm safety-check

# Start development safely (will run safety check first)
pnpm dev:safe
```

## 🔒 Safety Layers

### Layer 1: Environment Variables
```bash
# In .env.local (default - SAFE)
ENABLE_OPENAI_CALLS=false
ENABLE_JOB_PROCESSING=false

# AI Cost Limiting (when AI is enabled)
AI_CANDIDATE_PERCENTAGE=20  # Only top 20% get AI processing
AI_MAX_CANDIDATES=60        # Never more than 60 AI calls
```

### Layer 2: OpenAI Safety Wrapper
- All OpenAI calls go through `OpenAISafetyWrapper.makeCall()`
- Blocks calls in development unless explicitly enabled
- Tracks costs and enforces daily limits (£5/day)
- Logs all API usage to `openai-costs.log`

### Layer 3: Job Processing Protection
- Jobs are created but not processed in development
- Returns mock results instead of making real API calls
- Clear logging when jobs are blocked

### Layer 4: UI Warnings
- Visual indicators show when costs are enabled
- Real-time cost tracking in development
- Clear warnings before expensive operations

## 📊 Cost Monitoring & Limiting

### AI Cost Limiting (NEW!)
- **Only top 20% of candidates** get AI processing by default
- **Maximum 60 AI calls** per generation (configurable)
- **Significant savings**: At aggressive level (300 candidates), only 60 get AI processing
- **Quality maintained**: AI focuses on the highest-scoring locations

### Cost Limiting Examples
| Aggression | Total Candidates | AI Processed | Skipped | Estimated Savings |
|------------|------------------|--------------|---------|-------------------|
| Light (20) | 50               | 10 (20%)     | 40      | £0.0007          |
| Medium (50)| 150              | 30 (20%)     | 120     | £0.0022          |
| Aggressive | 300              | 60 (20%)     | 240     | £0.0043          |

### View Current Costs
```bash
# Check today's and total costs
curl http://localhost:3002/api/expansion/cost-summary
```

### Cost Log File
All API calls are logged to `openai-costs.log`:
```json
{"timestamp":"2025-11-03T14:30:00.000Z","tokens":150,"cost":0.0012,"context":"expansion-rationale","environment":"development","jobId":"abc123"}
```

## ⚠️ Enabling Costs (When You Want Real AI)

### Option 1: Environment Variables
```bash
# Add to .env.local
ENABLE_OPENAI_CALLS=true
ENABLE_JOB_PROCESSING=true

# Start development (will show cost warnings)
pnpm dev
```

### Option 2: Session Variables
```bash
# Enable for this session only
export ENABLE_OPENAI_CALLS=true
export ENABLE_JOB_PROCESSING=true
pnpm dev
```

## 🧪 Testing Safely

### Zero-Cost Testing
```bash
# Default mode - no costs
pnpm dev:safe

# All OpenAI calls return mock responses
# All jobs complete with mock data
# UI shows "Safe Mode" indicator
```

### Cost-Aware Testing
```bash
# Enable costs for testing
export ENABLE_OPENAI_CALLS=true
export ENABLE_JOB_PROCESSING=true
pnpm dev

# UI shows cost warnings
# Real API calls are made
# Costs are tracked and limited
```

## 🔧 Safety Commands

### Check Safety Status
```bash
pnpm safety-check
```
Checks:
- Environment variables
- Running processes
- Database jobs
- Port usage
- Cost history

### Safe Development
```bash
pnpm dev:safe
```
- Runs safety check first
- Only starts if safe
- Prevents accidental costs

### Manual Cleanup
```bash
# Stop all processes
pkill -f "pnpm.*dev"

# Check for running jobs
cd packages/db
sqlite3 prisma/dev.db "SELECT * FROM ExpansionJob WHERE status IN ('queued', 'running');"

# Stop running jobs
sqlite3 prisma/dev.db "UPDATE ExpansionJob SET status = 'failed', error = 'Manually stopped' WHERE status IN ('queued', 'running');"
```

## 🚨 Emergency Stop

If you suspect unauthorized costs:

```bash
# 1. Stop all processes immediately
pkill -f node
pkill -f pnpm

# 2. Check and stop database jobs
cd packages/db
sqlite3 prisma/dev.db "UPDATE ExpansionJob SET status = 'failed', error = 'Emergency stop' WHERE status IN ('queued', 'running');"

# 3. Disable API calls
echo "ENABLE_OPENAI_CALLS=false" >> apps/admin/.env.local
echo "ENABLE_JOB_PROCESSING=false" >> apps/admin/.env.local

# 4. Verify safety
pnpm safety-check
```

## 📈 Cost Limits

### Daily Limit
- Default: £5.00 per day
- Configurable in `OpenAISafetyWrapper`
- Blocks calls when exceeded

### Per-Call Alerts
- Warns if single call > £0.50
- Logs all costs for tracking
- Shows running totals

## 🎯 Best Practices

### Before Development
1. Run `pnpm safety-check`
2. Verify environment variables
3. Check no processes are running
4. Use `pnpm dev:safe` by default

### During Development
1. Monitor cost warnings in UI
2. Check `openai-costs.log` regularly
3. Use mock mode for most testing
4. Only enable costs when needed

### After Development
1. Stop all processes cleanly
2. Verify no jobs are running
3. Check final costs in log
4. Reset environment variables

## 🔍 Troubleshooting

### "Job processing disabled" message
- This is normal and safe
- Jobs complete with mock data
- No costs are incurred

### Cost warnings in UI
- Red warning = costs enabled
- Green indicator = safe mode
- Click to expand for details

### Safety check fails
- Review the specific failures
- Fix issues before developing
- Don't bypass safety checks

## 🎉 Success Indicators

### Safe Mode Active
- ✅ Green "Safe Mode" indicator
- ✅ `pnpm safety-check` passes
- ✅ No cost warnings
- ✅ Mock responses in logs

### Costs Properly Enabled
- ⚠️ Red cost warning visible
- ⚠️ Real API calls in logs
- ⚠️ Cost tracking active
- ⚠️ Daily limits enforced

Remember: **When in doubt, run `pnpm safety-check` first!**