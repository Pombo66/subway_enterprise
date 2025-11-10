/**
 * Application configuration
 */

export const config = {
  // Development settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Auth bypass for development (set to false to require login)
  isDevAuthBypass: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true',
  
  // Debug mode
  isDebugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
  
  // API URLs
  bffUrl: process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001',
  
  // Feature flags
  features: {
    subMind: process.env.NEXT_PUBLIC_FEATURE_SUBMIND === 'true',
    expansionPredictor: process.env.NEXT_PUBLIC_FEATURE_EXPANSION_PREDICTOR === 'true',
  },
};
