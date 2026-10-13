import { createHmac } from 'crypto';
import { logger } from '@whatsapp-automation/observability';

/**
 * WhatsApp Webhook Signature Validator
 * 
 * Validates webhook requests from Meta using HMAC SHA256
 * Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export class WebhookSignatureValidator {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    this.webhookSecret = webhookSecret;
  }

  /**
   * Validate webhook signature
   * 
   * @param signature - The X-Hub-Signature-256 header value
   * @param rawBody - The raw request body as string or buffer
   * @returns true if signature is valid
   */
  validate(signature: string, rawBody: string | Buffer): boolean {
    if (!signature) {
      logger.warn('Missing webhook signature');
      return false;
    }

    if (!signature.startsWith('sha256=')) {
      logger.warn('Invalid signature format');
      return false;
    }

    const expectedSignature = signature.substring(7); // Remove 'sha256=' prefix
    
    const hmac = createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const calculatedSignature = hmac.digest('hex');

    const isValid = this.secureCompare(expectedSignature, calculatedSignature);

    if (!isValid) {
      logger.warn({
        expected: expectedSignature.substring(0, 10) + '...',
        calculated: calculatedSignature.substring(0, 10) + '...',
      }, 'Webhook signature validation failed');
    }

    return isValid;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Verify webhook challenge for initial setup
   * 
   * @param mode - The hub.mode parameter
   * @param token - The hub.verify_token parameter
   * @param challenge - The hub.challenge parameter
   * @returns The challenge string if validation passes, null otherwise
   */
  verifyChallenge(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookSecret) {
      logger.info('Webhook verification challenge accepted');
      return challenge;
    }

    logger.warn({ mode, token: token?.substring(0, 5) + '...' }, 'Webhook verification challenge failed');
    return null;
  }
}
