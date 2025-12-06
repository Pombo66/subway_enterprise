INSERT INTO "FeatureFlag" (id, key, enabled, description, "createdAt", "updatedAt")
VALUES 
  ('ai_continuous_intelligence', 'ai_continuous_intelligence', false, 'Enable continuous AI analysis of all stores (runs daily)', NOW(), NOW()),
  ('ai_ondemand_intelligence', 'ai_ondemand_intelligence', true, 'Enable on-demand AI analysis (user-triggered)', NOW(), NOW()),
  ('ai_network_patterns', 'ai_network_patterns', false, 'Enable network-wide pattern analysis', NOW(), NOW()),
  ('ai_auto_recommendations', 'ai_auto_recommendations', false, 'Enable automatic recommendation generation', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  "updatedAt" = NOW();

SELECT key, enabled, description FROM "FeatureFlag" WHERE key LIKE 'ai_%' ORDER BY key;
