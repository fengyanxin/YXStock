import { StockSDK } from 'stock-sdk';

export const sdk = new StockSDK({
  timeout: 10000,
  rateLimit: { requestsPerSecond: 5, maxBurst: 10 },
  retry: { maxRetries: 3, baseDelay: 800 },
  circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
  providerPolicies: {
    eastmoney: {
      rateLimit: { requestsPerSecond: 3, maxBurst: 3 },
      circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    },
  },
});
