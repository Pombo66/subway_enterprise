#!/usr/bin/env node

import { readFileSync } from 'fs';

// Read API key from .env file
const envContent = readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log('🧪 Final test of GPT-5 rationale generation fix...');

// Test the exact same call that was failing before
async function testRationaleGeneration() {
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        input: `System: You are a business analyst specializing in restaurant site selection. Provide concise, factor-based rationales for location recommendations. When data is marked as "unknown", acknowledge the limitation but still provide analysis based on available data.

User: Generate a concise 2-3 sentence rationale for why this location is suitable for a Subway restaurant.
Provide factor-based analysis covering population, proximity, and sales potential.

Location: 52.5122, 13.4017

SCORES:
Population Score: 85%
Proximity Gap: 70%
Sales Potential: 75%

DETAILED METRICS:
Nearest Store Distance: 2.3 km
Trade Area Population: 45,000
Proximity Gap Percentile: 78th
Turnover Percentile: 72nd
Urban Density Index: 0.85
Road Access: 150m from road
Building Proximity: 50m from buildings

Provide a concise, factor-based rationale. Acknowledge any "unknown" data but focus on available metrics.`,
        max_output_tokens: 1000,
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`📊 Response status: ${data.status}`);
    console.log(`📊 Output items: ${data.output?.length || 0}`);
    
    // Apply the fixed parsing logic
    if (!data.output || !Array.isArray(data.output)) {
      throw new Error('No response from OpenAI');
    }

    // Check if response is incomplete
    if (data.status === 'incomplete') {
      console.warn(`⚠️  Incomplete response: ${data.incomplete_details?.reason || 'unknown reason'}`);
    }

    // Find the message output (type: "message")
    const messageOutput = data.output.find((item) => item.type === 'message');
    if (!messageOutput || !messageOutput.content || !messageOutput.content[0]) {
      throw new Error(`No message content in OpenAI response (status: ${data.status}, outputs: ${data.output.map((o) => o.type).join(', ')})`);
    }

    const rationaleText = messageOutput.content[0].text.trim();
    const tokensUsed = data.usage?.total_tokens || 0;
    
    console.log('\n✅ SUCCESS! Rationale generated:');
    console.log(`"${rationaleText}"`);
    console.log(`\n📊 Tokens used: ${tokensUsed}`);
    console.log(`📊 Input tokens: ${data.usage?.input_tokens || 0}`);
    console.log(`📊 Output tokens: ${data.usage?.output_tokens || 0}`);
    console.log(`📊 Reasoning tokens: ${data.usage?.output_tokens_details?.reasoning_tokens || 0}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

const success = await testRationaleGeneration();

if (success) {
  console.log('\n🎉 GPT-5 response parsing fix is working correctly!');
  console.log('✅ The expansion system should now generate AI rationales successfully.');
} else {
  console.log('\n❌ The fix still has issues that need to be resolved.');
}