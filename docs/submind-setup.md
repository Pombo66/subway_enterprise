# SubMind AI Copilot Setup Guide

SubMind is an AI-powered copilot that provides intelligent assistance for the Subway Enterprise management system. This guide will help you set up and configure SubMind in your environment.

## Prerequisites

- Node.js 18+ and pnpm installed
- PostgreSQL database running
- OpenAI API account and API key

## Quick Setup

### 1. Environment Configuration

Copy the environment configuration files:

```bash
# Copy main environment file
cp .env.example .env

# Copy backend configuration
cp .env.example apps/bff/.env

# Copy frontend configuration  
cp .env.example apps/admin/.env.local
```

### 2. OpenAI API Key Setup

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add the key to your environment files:

```bash
# In apps/bff/.env
OPENAI_API_KEY=sk-your-actual-api-key-here

# In apps/admin/.env.local
NEXT_PUBLIC_FEATURE_SUBMIND=true
```

### 3. Install Dependencies

```bash
# Install OpenAI dependency (if not already installed)
pnpm -C apps/bff add openai

# Install all dependencies
pnpm install
```

### 4. Start Services

```bash
# Start the BFF service
pnpm -C apps/bff dev

# Start the Admin frontend (in another terminal)
pnpm -C apps/admin dev
```

## Configuration Options

### Backend Configuration (apps/bff/.env)

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=sk-your-api-key-here

# Optional: Rate Limiting Configuration
SUBMIND_RATE_LIMIT_REQUESTS=10    # Requests per window (default: 10)
SUBMIND_RATE_LIMIT_WINDOW=60      # Window size in seconds (default: 60)
```

### Frontend Configuration (apps/admin/.env.local)

```bash
# Feature Flag - Enable/Disable SubMind UI
NEXT_PUBLIC_FEATURE_SUBMIND=true

# BFF API URL (should match your BFF service)
NEXT_PUBLIC_BFF_URL=http://localhost:3001
```

## Features

### Ask Mode
- Freeform chat interface with AI
- Context-aware responses based on current screen
- Optional context pickers for region, country, store, and franchisee
- Markdown-formatted responses with sources

### Explain Mode  
- Auto-generated prompts based on current screen
- Contextual explanations of KPIs and metrics
- Editable prompt preview before submission
- Screen-specific templates for different pages

### Generate Mode
- Executive Summary CSV generation with downloadable files
- Action Checklist creation with numbered next steps
- Client-side file generation (no server storage)
- Context-aware artifact creation

## Usage

1. **Access SubMind**: Look for the floating "Ask SubMind" button in the bottom-right corner
2. **Open Command Center**: Click the button to open the SubMind drawer
3. **Choose Mode**: Select Ask, Explain, or Generate tab based on your needs
4. **Interact**: Submit queries, review explanations, or generate artifacts
5. **Export**: Copy responses or download generated CSV files

## API Endpoints

### POST /ai/submind/query

Submit queries to the SubMind AI service.

**Request:**
```json
{
  "prompt": "Your question or request",
  "context": {
    "screen": "dashboard",
    "scope": {
      "region": "EMEA",
      "country": "UK",
      "storeId": "store-123"
    }
  }
}
```

**Response:**
```json
{
  "message": "AI-generated response",
  "sources": [
    {
      "type": "api",
      "ref": "Current screen context"
    }
  ],
  "meta": {
    "tokens": 150,
    "latencyMs": 1200
  }
}
```

## Error Handling

### Common Issues

**"AI disabled - missing API key"**
- Ensure `OPENAI_API_KEY` is set in `apps/bff/.env`
- Restart the BFF service after adding the key
- Verify the API key is valid and has sufficient credits

**"Rate limit exceeded"**
- Default limit is 10 requests per 60 seconds per IP
- Adjust `SUBMIND_RATE_LIMIT_REQUESTS` and `SUBMIND_RATE_LIMIT_WINDOW` if needed
- Wait for the rate limit window to reset

**SubMind UI not visible**
- Check `NEXT_PUBLIC_FEATURE_SUBMIND=true` in `apps/admin/.env.local`
- Restart the Admin frontend after configuration changes
- Verify the feature flag is properly loaded

### Error Codes

- `AI_DISABLED`: OpenAI API key not configured
- `RATE_LIMITED`: Too many requests, includes retry-after time
- `VALIDATION_ERROR`: Invalid input format or parameters
- `AI_SERVICE_ERROR`: OpenAI API error or service unavailable

## Security Considerations

- API keys are only read from environment variables
- User prompts are sanitized and length-limited (4000 chars max)
- No prompts or responses are stored in the database
- Rate limiting prevents abuse
- All telemetry excludes sensitive user data

## Monitoring and Telemetry

SubMind automatically tracks usage metrics:

- Query volume and response times
- Token usage and costs
- Error rates and types
- Feature adoption metrics

Telemetry events are stored in the existing telemetry system and can be viewed in the analytics dashboard.

## Troubleshooting

### Development Mode

Enable debug logging by setting:
```bash
NEXT_PUBLIC_DEBUG_MODE=true
```

### Check Service Status

Verify SubMind is working:
```bash
# Test the API endpoint
curl -X POST http://localhost:3001/ai/submind/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello SubMind"}'
```

### Common Solutions

1. **Clear browser cache** if UI changes aren't visible
2. **Restart services** after environment variable changes  
3. **Check browser console** for JavaScript errors
4. **Verify API key credits** in OpenAI dashboard
5. **Check network connectivity** to OpenAI API

## Support

For additional help:
- Check the browser console for error messages
- Review BFF service logs for API errors
- Verify environment configuration matches this guide
- Ensure all dependencies are properly installed

## Production Deployment

For production environments:

1. Use secure API key management (e.g., AWS Secrets Manager)
2. Configure appropriate rate limits for your usage
3. Monitor token usage and costs
4. Set up proper logging and alerting
5. Consider using OpenAI organization settings for billing

Remember to never commit API keys to version control!