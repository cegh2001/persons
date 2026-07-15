/**
 * Fetch wrapper with retry + exponential backoff.
 */

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  config: RetryConfig = {}
): Promise<Response> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...DEFAULT_CONFIG, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      // Only retry on network errors or 5xx server errors
      if (response.ok || response.status < 500 || attempt === maxRetries) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status}`);
    } catch (err) {
      lastError = err;
    }

    // Don't delay after the last attempt
    if (attempt < maxRetries) {
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
