/**
 * SCP Remote Server - Cloudflare Worker Entry Point
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, AuthRequest, JSONRPCRequest } from './types.js';
import {
  initAuthorization,
  pollAuthorization,
  confirmAuthorization
} from './oauth/authorize.js';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken
} from './oauth/token.js';
import { handleRPCRequest } from './rpc/handler.js';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/*', cors());

/**
 * GET /v1/capabilities
 * Return server capabilities
 */
app.get('/v1/capabilities', (c) => {
  return c.json({
    version: '1.0',
    protocol_version: 'scp1',
    scopes_supported: [
      'orders',
      'loyalty',
      'offers',
      'preferences',
      'intent:read',
      'intent:create',
      'intent:write',
      'intent:delete'
    ],
    authorization_endpoint: `${c.env.PUBLIC_URL}/v1/authorize/init`,
    token_endpoint: `${c.env.PUBLIC_URL}/v1/token`,
    revocation_endpoint: `${c.env.PUBLIC_URL}/v1/revoke`,
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    magic_link_supported: true,
    webhook_support: false,
    rate_limit: {
      requests_per_minute: 100,
      requests_per_hour: 1000
    }
  });
});

/**
 * POST /v1/authorize/init
 * Initialize magic link authorization
 */
app.post('/v1/authorize/init', async (c) => {
  try {
    const request: AuthRequest = await c.req.json();
    console.log('[AUTH] Initializing authorization:', {
      email: request.email,
      client_id: request.client_id,
      scopes: request.scopes,
      domain: request.domain
    });

    const response = await initAuthorization(request, c.env);

    console.log('[AUTH] Authorization initialized:', {
      auth_request_id: response.auth_request_id,
      expires_in: response.expires_in
    });

    return c.json(response);
  } catch (error: any) {
    console.error('[AUTH] Authorization init failed:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });

    if (error.message === 'customer_not_found') {
      return c.json({
        error: 'customer_not_found',
        error_description: `No account found for email`
      }, 404);
    }

    return c.json({
      error: 'server_error',
      error_description: error.message,
      details: error.stack
    }, 500);
  }
});

/**
 * GET /v1/authorize/poll
 * Poll for authorization status
 */
app.get('/v1/authorize/poll', async (c) => {
  try {
    const authRequestId = c.req.query('auth_request_id');
    const clientId = c.req.query('client_id');

    console.log('[POLL] Polling authorization:', {
      auth_request_id: authRequestId,
      client_id: clientId,
      has_auth_request_id: !!authRequestId,
      has_client_id: !!clientId
    });

    if (!authRequestId || !clientId) {
      console.log('[POLL] Missing required parameters');
      return c.json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }, 400);
    }

    const response = await pollAuthorization(authRequestId, clientId, c.env);

    console.log('[POLL] Poll response:', {
      status: response.status,
      has_code: !!response.code
    });

    return c.json(response);
  } catch (error: any) {
    console.error('[POLL] Polling failed:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return c.json({
      error: 'server_error',
      error_description: error.message,
      details: error.stack
    }, 500);
  }
});

/**
 * GET /v1/authorize/confirm
 * Magic link landing page - user clicks to confirm
 */
app.get('/v1/authorize/confirm', async (c) => {
  try {
    const magicToken = c.req.query('token');

    if (!magicToken) {
      return c.html('<h1>Invalid Link</h1><p>This authorization link is invalid or expired.</p>', 400);
    }

    await confirmAuthorization(magicToken, c.env);

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center; }
            h1 { color: #4CAF50; }
          </style>
        </head>
        <body>
          <h1>✓ Authorization Successful</h1>
          <p>You can now close this window and return to your AI assistant.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Failed</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center; }
            h1 { color: #f44336; }
          </style>
        </head>
        <body>
          <h1>✗ Authorization Failed</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `, 400);
  }
});

/**
 * POST /v1/token
 * Exchange code for tokens or refresh token
 */
app.post('/v1/token', async (c) => {
  try {
    console.log('[TOKEN] Token exchange request received');

    const body = await c.req.parseBody();
    console.log('[TOKEN] Request body parsed:', {
      grant_type: body.grant_type,
      has_code: !!(body.code),
      has_code_verifier: !!(body.code_verifier),
      has_client_id: !!(body.client_id),
      has_refresh_token: !!(body.refresh_token),
      code_length: body.code ? (body.code as string).length : 0,
      client_id: body.client_id
    });

    const grantType = body.grant_type as string;

    if (grantType === 'authorization_code') {
      console.log('[TOKEN] Processing authorization_code grant');
      const response = await exchangeCodeForTokens(
        body.code as string,
        body.code_verifier as string,
        body.client_id as string,
        c.env
      );
      console.log('[TOKEN] Token exchange successful');
      return c.json(response);
    } else if (grantType === 'refresh_token') {
      console.log('[TOKEN] Processing refresh_token grant');
      const response = await refreshAccessToken(
        body.refresh_token as string,
        body.client_id as string,
        c.env
      );
      console.log('[TOKEN] Token refresh successful');
      return c.json(response);
    } else {
      console.log('[TOKEN] Unsupported grant type:', grantType);
      return c.json({
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grantType}' not supported`
      }, 400);
    }
  } catch (error: any) {
    console.error('[TOKEN] Token exchange failed:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return c.json({
      error: 'invalid_grant',
      error_description: error.message,
      details: error.stack
    }, 400);
  }
});

/**
 * POST /v1/revoke
 * Revoke token
 */
app.post('/v1/revoke', async (c) => {
  try {
    const body = await c.req.parseBody();
    const token = body.token as string;

    if (!token) {
      return c.json({
        error: 'invalid_request',
        error_description: 'Missing token parameter'
      }, 400);
    }

    await revokeToken(token, c.env);

    return c.json({ status: 'revoked' });
  } catch (error: any) {
    return c.json({
      error: 'server_error',
      error_description: error.message
    }, 500);
  }
});

/**
 * POST /v1/rpc
 * JSON-RPC 2.0 endpoint for all SCP methods
 */
app.post('/v1/rpc', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: 'Unauthorized: Missing or invalid Authorization header'
        }
      }, 401);
    }

    const accessToken = authHeader.substring(7);
    const rpcRequest: JSONRPCRequest = await c.req.json();

    const response = await handleRPCRequest(rpcRequest, accessToken, c.env);

    return c.json(response);
  } catch (error: any) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    }, 500);
  }
});

/**
 * 404 handler
 */
app.notFound((c) => {
  return c.json({
    error: 'not_found',
    message: 'Endpoint not found'
  }, 404);
});

export default app;
