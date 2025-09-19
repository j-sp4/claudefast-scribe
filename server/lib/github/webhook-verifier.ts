import crypto from 'crypto';

/**
 * Verifies GitHub webhook signature
 * @param payload - Raw request body
 * @param signature - X-Hub-Signature-256 header value
 * @returns true if signature is valid
 */
export function verifyGitHubWebhook(payload: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured - webhook verification disabled');
    return true; // Allow in development
  }

  // Create expected signature
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Compare signatures securely
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
