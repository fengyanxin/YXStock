import { StockSDK } from 'stock-sdk';

export const sdk = new StockSDK({
  timeout: 30000,
  rateLimit: { requestsPerSecond: 3, maxBurst: 6 },
  retry: { maxRetries: 3, baseDelay: 1000 },
  circuitBreaker: { failureThreshold: 5, resetTimeout: 30000 },
  providerPolicies: {
    eastmoney: {
      rateLimit: { requestsPerSecond: 2, maxBurst: 3 },
      circuitBreaker: { failureThreshold: 3, resetTimeout: 30000 },
    },
  },
});
