/**
 * OAuth authorization endpoints
 */

import type { Env, AuthRequest, AuthRequestStored } from '../types.js';
import { verifyEmail } from '../mock-data/customer.js';
import { generateAccessToken, generateRefreshToken } from './jwt.js';
import { sendMagicLinkEmail } from '../email/magic-link.js';

/**
 * Initialize authorization request
 */
export async function initAuthorization(
  request: AuthRequest,
  env: Env
): Promise<{
  auth_request_id: string;
  email_sent: boolean;
  expires_in: number;
  poll_interval: number;
}> {
  console.log('[AUTHORIZE] Starting authorization for:', request.email);

  // Generate auth request ID
  const authRequestId = generateId();
  const now = Date.now();
  const expiresAt = now + (10 * 60 * 1000); // 10 minutes

  // Store auth request in KV WITHOUT verifying customer yet
  // Verification happens AFTER user clicks magic link
  const authRequestData: AuthRequestStored = {
    id: authRequestId,
    email: request.email,
    customer_id: null as any, // Will be set after magic link confirmation
    client_id: request.client_id,
    client_name: request.client_name,
    scopes: request.scopes,
    code_challenge: request.code_challenge,
    status: 'pending',
    created_at: now,
    expires_at: expiresAt
  };

  await env.AUTH_REQUESTS.put(
    authRequestId,
    JSON.stringify(authRequestData),
    { expirationTtl: 600 } // 10 minutes
  );

  // Generate magic link token
  const magicToken = generateId();
  await env.MAGIC_LINK_TOKENS.put(
    magicToken,
    authRequestId,
    { expirationTtl: 600 }
  );

  console.log('[AUTHORIZE] Auth request created, magic link generated');
  console.log('[AUTHORIZE] Magic link: ' + env.PUBLIC_URL + '/v1/authorize/confirm?token=' + magicToken);
  console.log('[AUTHORIZE] Client ID: ' + request.client_id);
  console.log('[AUTHORIZE] Client Name: ' + request.client_name);
  
  // Send magic link email
  await sendMagicLinkEmail(env, request.email, request.domain || 'the merchant', magicToken);

  return {
    auth_request_id: authRequestId,
    email_sent: true,
    expires_in: 600,
    poll_interval: 2
  };
}

/**
 * Poll authorization status
 */
export async function pollAuthorization(
  authRequestId: string,
  clientId: string,
  env: Env
): Promise<{
  status: 'pending' | 'authorized' | 'denied' | 'expired';
  code?: string;
  expires_in?: number;
}> {
  console.log('[POLL] Looking up auth request:', authRequestId);

  let data;
  try {
    data = await env.AUTH_REQUESTS.get(authRequestId);
  } catch (error: any) {
    console.error('[POLL] KV get failed:', {
      error: error.message,
      authRequestId
    });
    throw error;
  }

  if (!data) {
    console.log('[POLL] Auth request not found in KV - expired or invalid');
    return { status: 'expired' };
  }

  console.log('[POLL] Auth request data retrieved, parsing...');
  let authRequest: AuthRequestStored;
  try {
    authRequest = JSON.parse(data);
  } catch (error: any) {
    console.error('[POLL] JSON parse failed:', {
      error: error.message,
      data: data.substring(0, 100)
    });
    throw new Error('Failed to parse auth request data');
  }

  console.log('[POLL] Auth request parsed:', {
    status: authRequest.status,
    client_id: authRequest.client_id,
    email: authRequest.email,
    has_code: !!authRequest.code,
    expires_at: authRequest.expires_at,
    now: Date.now()
  });

  // Verify client_id matches
  if (authRequest.client_id !== clientId) {
    console.error('[POLL] Client ID mismatch:', {
      expected: authRequest.client_id,
      provided: clientId
    });
    throw new Error('Invalid client_id');
  }

  // Check expiration
  if (authRequest.expires_at < Date.now()) {
    console.log('[POLL] Auth request expired');
    return { status: 'expired' };
  }

  if (authRequest.status === 'authorized' && authRequest.code) {
    console.log('[POLL] Auth request authorized, returning code');
    return {
      status: 'authorized',
      code: authRequest.code
    };
  }

  if (authRequest.status === 'denied') {
    console.log('[POLL] Auth request denied');
    return { status: 'denied' };
  }

  const expiresIn = Math.floor((authRequest.expires_at - Date.now()) / 1000);
  console.log('[POLL] Auth request still pending, expires in:', expiresIn);
  return {
    status: 'pending',
    expires_in: expiresIn
  };
}

/**
 * Confirm authorization (called when user clicks magic link)
 * This is where we verify the email with customer database AFTER user consent
 */
export async function confirmAuthorization(
  magicToken: string,
  env: Env
): Promise<void> {
  console.log('[AUTHORIZE] Confirming authorization with magic link');

  // Get auth request ID from magic link token
  const authRequestId = await env.MAGIC_LINK_TOKENS.get(magicToken);

  if (!authRequestId) {
    console.log('[AUTHORIZE] Invalid or expired magic link token');
    throw new Error('Invalid or expired magic link');
  }

  // Get auth request
  const data = await env.AUTH_REQUESTS.get(authRequestId);
  if (!data) {
    console.log('[AUTHORIZE] Auth request expired');
    throw new Error('Authorization request expired');
  }

  const authRequest: AuthRequestStored = JSON.parse(data);

  console.log('[AUTHORIZE] Magic link confirmed, now verifying customer:', authRequest.email);

  // NOW verify with customer database - user has already given consent by clicking link
  let verification;
  try {
    verification = await verifyEmail(authRequest.email);
    console.log('[AUTHORIZE] Customer verification result:', verification);
  } catch (error: any) {
    console.error('[AUTHORIZE] Customer verification failed:', {
      error: error.message,
      stack: error.stack
    });
    // Update auth request to denied status
    authRequest.status = 'denied';
    await env.AUTH_REQUESTS.put(
      authRequestId,
      JSON.stringify(authRequest),
      { expirationTtl: 600 }
    );
    throw new Error('Customer not found in merchant system');
  }

  if (!verification.exists || !verification.customerId) {
    console.log('[AUTHORIZE] Customer not found in system');
    // Update auth request to denied status
    authRequest.status = 'denied';
    await env.AUTH_REQUESTS.put(
      authRequestId,
      JSON.stringify(authRequest),
      { expirationTtl: 600 }
    );
    throw new Error('Customer not found in merchant system');
  }

  console.log('[AUTHORIZE] Customer verified:', verification.customerId);

  // Generate authorization code
  const authCode = generateId();

  // Store in D1 for code exchange
  await env.DB.prepare(`
    INSERT INTO auth_codes (
      code, customer_email, cordial_contact_id, client_id, scopes,
      code_challenge, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    authCode,
    authRequest.email,
    verification.customerId, // Use the verified customer ID
    authRequest.client_id,
    JSON.stringify(authRequest.scopes),
    authRequest.code_challenge,
    Date.now() + (5 * 60 * 1000), // 5 minutes
    Date.now()
  ).run();

  // Update auth request status
  authRequest.status = 'authorized';
  authRequest.code = authCode;
  authRequest.customer_id = verification.customerId; // Store the customer ID

  await env.AUTH_REQUESTS.put(
    authRequestId,
    JSON.stringify(authRequest),
    { expirationTtl: 600 }
  );

  // Delete magic link token (single use)
  await env.MAGIC_LINK_TOKENS.delete(magicToken);

  console.log('[AUTHORIZE] Authorization confirmed and code generated');
}

/**
 * Generate random ID
 */
function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
