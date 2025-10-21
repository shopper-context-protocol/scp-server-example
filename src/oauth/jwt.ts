/**
 * JWT token generation and validation
 * Using Web Crypto API (available in Cloudflare Workers)
 */

import type { Env, TokenPayload } from '../types.js';

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  contactId: string,
  email: string,
  scopes: string[],
  secret: string
): Promise<string> {
  const payload: TokenPayload = {
    sub: contactId,
    email,
    scopes,
    type: 'access_token',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  return createJWT(payload, secret);
}

/**
 * Verify and decode JWT token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<TokenPayload> {
  return verifyJWT(token, secret) as Promise<TokenPayload>;
}

/**
 * Create JWT using HMAC SHA-256
 */
async function createJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));

  const signature = await sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT signature and decode payload
 */
async function verifyJWT(token: string, secret: string): Promise<Record<string, any>> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify signature
  const expectedSignature = await sign(`${encodedHeader}.${encodedPayload}`, secret);
  if (signature !== expectedSignature) {
    throw new Error('Invalid JWT signature');
  }

  // Decode payload
  const payload = JSON.parse(base64urlDecode(encodedPayload));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }

  return payload;
}

/**
 * Sign data using HMAC SHA-256
 */
async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return base64urlEncode(signature);
}

/**
 * Base64URL encode
 */
function base64urlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    base64 = btoa(String.fromCharCode(...bytes));
  }

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64urlDecode(data: string): string {
  let base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  return atob(base64);
}

/**
 * Generate random refresh token
 */
export function generateRefreshToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array.buffer);
}

/**
 * Verify PKCE code challenge
 */
export async function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);

  const computedChallenge = base64urlEncode(hash);

  return computedChallenge === codeChallenge;
}
