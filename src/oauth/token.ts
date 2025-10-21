/**
 * OAuth token endpoint (exchange and refresh)
 */

import type { Env } from '../types.js';
import { generateAccessToken, generateRefreshToken, verifyPKCE } from './jwt.js';

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  clientId: string,
  env: Env
): Promise<{
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  customer_id: string;
  email: string;
}> {
  console.log('[TOKEN EXCHANGE] Starting code exchange:', {
    code_length: code?.length || 0,
    code_verifier_length: codeVerifier?.length || 0,
    client_id: clientId,
    has_code: !!code,
    has_verifier: !!codeVerifier,
    has_client_id: !!clientId
  });

  // Get auth code from D1
  console.log('[TOKEN EXCHANGE] Querying D1 for auth code');
  let result;
  try {
    result = await env.DB.prepare(`
      SELECT * FROM auth_codes WHERE code = ? AND used = 0
    `).bind(code).first();
  } catch (error: any) {
    console.error('[TOKEN EXCHANGE] D1 query failed:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }

  console.log('[TOKEN EXCHANGE] D1 query result:', {
    found: !!result,
    has_data: result ? Object.keys(result).length : 0
  });

  if (!result) {
    console.error('[TOKEN EXCHANGE] Auth code not found or already used');
    throw new Error('Invalid or used authorization code');
  }

  console.log('[TOKEN EXCHANGE] Auth code found:', {
    client_id: result.client_id,
    customer_email: result.customer_email,
    cordial_contact_id: result.cordial_contact_id,
    expires_at: result.expires_at,
    now: Date.now(),
    used: result.used
  });

  // Check expiration
  if ((result.expires_at as number) < Date.now()) {
    console.error('[TOKEN EXCHANGE] Auth code expired:', {
      expires_at: result.expires_at,
      now: Date.now()
    });
    throw new Error('Authorization code expired');
  }

  // Verify client_id
  if (result.client_id !== clientId) {
    console.error('[TOKEN EXCHANGE] Client ID mismatch:', {
      expected: result.client_id,
      provided: clientId
    });
    throw new Error('Invalid client_id');
  }

  // Verify PKCE
  console.log('[TOKEN EXCHANGE] Verifying PKCE');
  const pkceValid = await verifyPKCE(
    codeVerifier,
    result.code_challenge as string
  );

  if (!pkceValid) {
    console.error('[TOKEN EXCHANGE] PKCE verification failed');
    throw new Error('Invalid code_verifier');
  }

  console.log('[TOKEN EXCHANGE] PKCE verified successfully');

  // Mark code as used
  console.log('[TOKEN EXCHANGE] Marking code as used');
  await env.DB.prepare(`
    UPDATE auth_codes SET used = 1 WHERE code = ?
  `).bind(code).run();

  // Generate tokens
  console.log('[TOKEN EXCHANGE] Generating tokens');
  const scopes = JSON.parse(result.scopes as string) as string[];
  const accessToken = await generateAccessToken(
    result.cordial_contact_id as string,
    result.customer_email as string,
    scopes,
    env.JWT_SECRET
  );

  const refreshToken = generateRefreshToken();

  // Store refresh token in D1
  console.log('[TOKEN EXCHANGE] Storing refresh token');
  await env.DB.prepare(`
    INSERT INTO refresh_tokens (
      token, customer_email, cordial_contact_id, client_id, scopes,
      expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    refreshToken,
    result.customer_email,
    result.cordial_contact_id,
    clientId,
    result.scopes,
    Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    Date.now()
  ).run();

  console.log('[TOKEN EXCHANGE] Token exchange complete:', {
    customer_id: result.cordial_contact_id,
    email: result.customer_email,
    scopes: scopes.join(' ')
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: scopes.join(' '),
    customer_id: result.cordial_contact_id as string,
    email: result.customer_email as string
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  env: Env
): Promise<{
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}> {
  // Get refresh token from D1
  const result = await env.DB.prepare(`
    SELECT * FROM refresh_tokens WHERE token = ?
  `).bind(refreshToken).first();

  if (!result) {
    throw new Error('Invalid refresh token');
  }

  // Check expiration
  if ((result.expires_at as number) < Date.now()) {
    throw new Error('Refresh token expired');
  }

  // Verify client_id
  if (result.client_id !== clientId) {
    throw new Error('Invalid client_id');
  }

  // Generate new tokens
  const scopes = JSON.parse(result.scopes as string) as string[];
  const newAccessToken = await generateAccessToken(
    result.cordial_contact_id as string,
    result.customer_email as string,
    scopes,
    env.JWT_SECRET
  );

  const newRefreshToken = generateRefreshToken();

  // Update refresh token in D1
  await env.DB.prepare(`
    UPDATE refresh_tokens
    SET token = ?, last_used = ?
    WHERE token = ?
  `).bind(
    newRefreshToken,
    Date.now(),
    refreshToken
  ).run();

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: scopes.join(' ')
  };
}

/**
 * Revoke token
 */
export async function revokeToken(
  token: string,
  env: Env
): Promise<void> {
  // Try to delete as refresh token
  await env.DB.prepare(`
    DELETE FROM refresh_tokens WHERE token = ?
  `).bind(token).run();

  // Note: Access tokens can't be revoked (stateless JWTs)
  // They will expire after 1 hour
}
