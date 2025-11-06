# AI Expansion System - Testing Guide

## Quick Start

Your AI expansion system is ready to test! The backend is running with GPT-5 models configured correctly.

## Prerequisites

1. ✅ BFF server running on `http://localhost:3001`
2. ✅ Your Subway store data uploaded and available
3. ✅ GPT-5 API key configured in environment variables

## Testing Methods

### Method 1: Using the Test Script (Recommended)

1. **Edit the test script** with your real Subway store data:
   ```bash
   # Open the test script
   code test-expansion.js  # or use your preferred editor
   ```

2. **Update the `existingStores` array** with your actual Subway locations:
   ```javascript
   existingStores: [
     { lat: 40.7580, lng: -73.9855, performance: 0.85 },
     { lat: 40.7484, lng: -73.9857, performance: 0.92 },
     // Add more of your Subway stores here
   ]
   ```

3. **Run the test**:
   ```bash
   node test-expansion.js
   ```

### Method 2: Using cURL

```bash
curl -X POST http://localhost:3001/ai/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{
    "region": "New York City",
    "bounds": {
      "north": 40.9176,
      "south": 40.4774,
      "east": -73.7004,
      "west": -74.2591
    },
    "existingStores": [
      { "lat": 40.7580, "lng": -73.9855, "performance": 0.85 }
    ],
    "targetCandidates": 10,
    "businessObjectives": {
      "riskTolerance": "MEDIUM",
      "expansionSpeed": "MODERATE",
      "marketPriorities": ["high-density", "underserved-areas"]
    },
    "pipelineConfig": {
      "enableMarketAnalysis": true,
      "enableZoneIdentification": true,
      "enableLocationDiscovery": true,
      "enableViabilityValidation": true,
      "enableStrategicScoring": true,
      "qualityThreshold": 0.7
    }
  }'
```

### Method 3: Using Postman/Insomnia

1. **Endpoint**: `POST http://localhost:3001/ai/pipeline/execute`
2. **Headers**: `Content-Type: application/json`
3. **Body**: See the JSON structure in Method 2 above

## API Endpoints

### 1. Execute AI Pipeline
**POST** `/ai/pipeline/execute`

Executes the full 5-stage AI-driven expansion pipeline.

**Request Body**:
```json
{
  "region": "string",
  "bounds": {
    "north": "number",
    "south": "number",
    "east": "number",
    "west": "number"
  },
  "existingStores": [
    {
      "lat": "number",
      "lng": "number",
      "performance": "number (optional, 0-1)"
    }
  ],
  "targetCandidates": "number",
  "businessObjectives": {
    "riskTolerance": "LOW | MEDIUM | HIGH",
    "expansionSpeed": "CONSERVATIVE | MODERATE | AGGRESSIVE",
    "marketPriorities": ["string array"]
  },
  "pipelineConfig": {
    "enableMarketAnalysis": "boolean",
    "enableZoneIdentification": "boolean",
    "enableLocationDiscovery": "boolean",
    "enableViabilityValidation": "boolean",
    "enableStrategicScoring": "boolean",
    "qualityThreshold": "number (0-1)"
  }
}
```

**Response**:
```json
{
  "finalCandidates": [
    {
      "lat": "number",
      "lng": "number",
      "score": "number",
      "rationale": "string"
    }
  ],
  "pipelineStages": {
    "marketAnalysis": {},
    "strategicZones": [],
    "locationCandidates": [],
    "validatedCandidates": [],
    "scoredCandidates": []
  },
  "metadata": {
    "totalExecutionTime": "number (ms)",
    "stagesExecuted": ["string array"],
    "totalTokensUsed": "number",
    "totalCost": "number (USD)",
    "successfulStages": "number",
    "failedStages": "number"
  },
  "qualityMetrics": {
    "candidateQuality": "number",
    "pipelineEfficiency": "number",
    "costEffectiveness": "number"
  }
}
```

### 2. AI Analysis (Alternative Endpoint)
**POST** `/expansion/ai-analysis`

Alternative endpoint for expansion analysis.

## Model Configuration

Your system is currently using:

| Stage | Model | Purpose |
|---|---|---|
| **Market Analysis** | `gpt-5-mini` | Analyze market conditions and opportunities |
| **Zone Identification** | `gpt-5-mini` | Identify strategic zones for expansion |
| **Location Discovery** | `gpt-5-nano` | Generate high-volume location candidates (cost-effective) |
| **Viability Validation** | `gpt-5-nano` + `gpt-5-mini` | Two-tier validation (quick + deep) |
| **Strategic Scoring** | `gpt-5-mini` | Executive-level strategic scoring |

## Expected Results

When testing, you should see:

1. **Market Analysis** - Understanding of the region's demographics and opportunities
2. **Strategic Zones** - Identified high-value areas for expansion
3. **Location Candidates** - Specific lat/lng coordinates for potential stores
4. **Validated Candidates** - Candidates that passed viability checks
5. **Scored Candidates** - Final ranked list with strategic scores

## Troubleshooting

### Error: "Cannot connect to server"
- Make sure BFF is running: `cd apps/bff && pnpm dev`
- Check that it's listening on port 3001

### Error: "API key not found"
- Ensure `OPENAI_API_KEY` is set in your environment
- Check `.env` file in the BFF app

### Error: "Model not found"
- Verify you have access to GPT-5 models
- Check the model names in the logs match what you have access to

### No candidates returned
- Check that your `bounds` cover a valid geographic area
- Ensure `existingStores` has valid lat/lng coordinates
- Try increasing `targetCandidates` number

## Cost Estimation

For a typical test run:
- **Market Analysis**: ~500-1000 tokens (gpt-5-mini)
- **Location Discovery**: ~2000-5000 tokens (gpt-5-nano)
- **Viability Validation**: ~1000-3000 tokens (mixed)
- **Strategic Scoring**: ~500-1000 tokens (gpt-5-mini)

**Estimated cost per run**: $0.01 - $0.05 USD

## Next Steps

After successful testing:

1. **Validate results** - Check if suggested locations make sense
2. **Visualize on map** - Plot the candidates on your frontend map
3. **Iterate** - Adjust `businessObjectives` and `pipelineConfig` to refine results
4. **Scale up** - Test with larger regions and more existing stores
5. **Add enhancements** - Integrate Census, World Bank, OpenStreetMap APIs for real data

## Support

If you encounter issues:
1. Check the BFF logs for detailed error messages
2. Review `UPDATES.md` to see what changes were made
3. Verify all AI services initialized correctly in the startup logs
