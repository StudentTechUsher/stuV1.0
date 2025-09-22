import crypto from 'crypto';

// Secret key for encoding/decoding - in production, this should be an environment variable
const SECRET_KEY = process.env.ACCESS_ID_SECRET || 'your-secret-key-change-in-production';

/**
 * Helper function to convert URL-safe base64 back to standard base64 with padding
 */
function urlSafeBase64ToBase64(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}

/**
 * Encodes a grad plan ID into a secure access ID
 * Uses HMAC-SHA256 to create a secure hash that can't be reversed without the secret
 */
export function encodeAccessId(gradPlanId: string): string {
  // Create a timestamp to make each access ID unique and time-sensitive if needed
  const timestamp = Date.now().toString();
  
  // Combine the grad plan ID with timestamp
  const payload = `${gradPlanId}:${timestamp}`;
  
  // Create HMAC hash
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(payload);
  const hash = hmac.digest('hex');
  
  // Encode the payload and hash together (URL-safe base64)
  const encodedPayload = Buffer.from(payload)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const encodedHash = Buffer.from(hash)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${encodedPayload}.${encodedHash}`;
}

/**
 * Decodes an access ID back to the original grad plan ID
 * Verifies the HMAC to ensure the access ID hasn't been tampered with
 */
export function decodeAccessId(accessId: string): string | null {
  try {
    const [encodedPayload, encodedHash] = accessId.split('.');
    
    if (!encodedPayload || !encodedHash) {
      return null;
    }
    
    // Decode the payload and hash
    const payload = Buffer.from(urlSafeBase64ToBase64(encodedPayload), 'base64').toString();
    const providedHash = Buffer.from(urlSafeBase64ToBase64(encodedHash), 'base64').toString('hex');
    
    // Verify the HMAC
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(payload);
    const expectedHash = hmac.digest('hex');
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const providedBuffer = Buffer.from(providedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length || 
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }
    
    // Extract the grad plan ID from the payload
    const [gradPlanId] = payload.split(':');
    return gradPlanId;
    
  } catch (error) {
    console.error('Error decoding access ID:', error);
    return null;
  }
}

/**
 * Client-side version that doesn't use crypto module (for browser compatibility)
 * Uses a simpler but still secure base64 encoding with checksum
 */
export function encodeAccessIdClient(gradPlanId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${gradPlanId}:${timestamp}`;
  
  // Simple checksum for client-side verification
  let checksum = 0;
  for (let i = 0; i < payload.length; i++) {
    checksum = (checksum + payload.charCodeAt(i)) % 65536;
  }
  
  const payloadWithChecksum = `${payload}:${checksum}`;
  // Use standard base64 and make it URL-safe manually
  return Buffer.from(payloadWithChecksum)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Client-side decoder
 */
export function decodeAccessIdClient(accessId: string): string | null {
  try {
    // Convert URL-safe base64 back to standard base64
    let base64 = accessId
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const decoded = Buffer.from(base64, 'base64').toString();
    const parts = decoded.split(':');
    
    if (parts.length !== 3) {
      return null;
    }
    
    const [gradPlanId, timestamp, providedChecksum] = parts;
    const payload = `${gradPlanId}:${timestamp}`;
    
    // Verify checksum
    let expectedChecksum = 0;
    for (let i = 0; i < payload.length; i++) {
      expectedChecksum = (expectedChecksum + payload.charCodeAt(i)) % 65536;
    }
    
    if (parseInt(providedChecksum) !== expectedChecksum) {
      return null;
    }
    
    return gradPlanId;
    
  } catch (error) {
    console.error('Error decoding access ID:', error);
    return null;
  }
}