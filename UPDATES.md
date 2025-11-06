# Updates Log

## Update 1 - 2025-11-06 15:30 UTC

**Changed**: Replaced all `gpt-3.5-turbo` references with `gpt-5-mini`

**Files modified**:
- `apps/bff/src/services/submind.service.ts`
- `apps/bff/src/services/submind-telemetry.service.ts`
- `apps/bff/src/services/__tests__/submind.service.test.ts`
- `apps/bff/src/services/__tests__/submind-telemetry.service.test.ts`
- `apps/admin/lib/import/addressNormalizer.ts`

**Verification**: Search for `gpt-3.5-turbo` in these files - should find 0 results (excluding node_modules)

---

## Update 2 - 2025-11-06 21:45 UTC

**Changed**: Fixed NestJS dependency injection - registered all AI pipeline services in AppModule

**Files modified**:
- `apps/bff/src/module.ts`

**What was fixed**:
- Added `MarketAnalysisService` to providers
- Added `StrategicZoneIdentificationService` to providers
- Added `LocationDiscoveryService` to providers
- Added `StrategicZoneGuidedGenerationService` to providers
- Added `ViabilityScoringValidationService` to providers
- Added `StrategicScoringService` to providers
- Added `ModelConfigurationManager` to providers

**Verification**: Application should start without "Nest can't resolve dependencies" error

---
