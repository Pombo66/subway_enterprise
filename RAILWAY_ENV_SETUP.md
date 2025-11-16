# Railway Environment Variables Setup

Add these environment variables in Railway dashboard for the admin service:

## Required for Supabase Auth
```
NEXT_PUBLIC_SUPABASE_URL=https://qhjakyehsvmqbrsgydim.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoamFreWVoc3ZtcWJyc2d5ZGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTYwMjgsImV4cCI6MjA3ODMzMjAyOH0.zBSQCvCDNJ8yxeQEQI_6qFW9y7uqfNICKGj_AavOm80
```

## Required for API Communication
```
NEXT_PUBLIC_API_URL=https://subwaybff-production.up.railway.app
```

## Required for Mapbox
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoicG9tYm82NiIsImEiOiJjbWhucmJibzYwMnlkMmlzaWJicXo5cnFlIn0.DzVzgDQGWJjr60RpyC1aSw
```

## Feature Flags
```
NEXT_PUBLIC_FEATURE_SUBMIND=true
NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR=true
```

## Database (if needed by admin)
```
DATABASE_URL=<your-production-postgres-url>
```

## OpenAI (if admin needs direct access)
```
OPENAI_API_KEY=<your-key>
EXPANSION_OPENAI_ENABLED=true
EXPANSION_OPENAI_MODEL=gpt-5-mini
```

## DO NOT SET (for production security)
```
# NEXT_PUBLIC_DEV_AUTH_BYPASS - Leave unset or set to false
```

After adding these, redeploy the admin service in Railway.
