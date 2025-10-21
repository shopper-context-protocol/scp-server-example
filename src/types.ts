/**
 * Type definitions for SCP Remote Server
 */

// Cloudflare Worker environment bindings
export interface Env {
  DB: D1Database;
  AUTH_REQUESTS: KVNamespace;
  MAGIC_LINK_TOKENS: KVNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY?: string; // Optional - if not set, logs magic link instead
  EMAIL_FROM?: string; // Optional - email sender address
  PUBLIC_URL: string;
  ENVIRONMENT: string;
}

// OAuth types
export interface AuthRequest {
  email: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  code_challenge: string;
  code_challenge_method: string;
  redirect_uri: string;
  state: string;
  domain: string;
}

export interface AuthRequestStored {
  id: string;
  email: string;
  customer_id: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  code_challenge: string;
  status: 'pending' | 'authorized' | 'denied';
  code?: string;
  created_at: number;
  expires_at: number;
}

export interface TokenPayload {
  sub: string; // customer_id
  email: string;
  scopes: string[];
  type: 'access_token';
  iat: number;
  exp: number;
}

// SCP schemas
export interface SCPOrder {
  order_id: string;
  date: string;
  total: number;
  currency: string;
  status: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  items: SCPOrderItem[];
}

export interface SCPOrderItem {
  product_id: string;
  name: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  image_url?: string;
  product_url?: string;
}

export interface SCPLoyalty {
  program_name: string;
  member_id: string;
  member_since: string;
  tier: string;
  points: {
    current: number;
    lifetime?: number;
    currency_value?: number;
    expiring_soon?: Array<{
      points: number;
      expires_at: string;
    }>;
  };
  benefits: string[];
  next_tier?: {
    name: string;
    points_needed: number;
    benefits: string[];
  };
}

export interface SCPIntent {
  intent_id: string;
  customer_id: string;
  base_intent: string;
  mechanism: string;
  ai_assistant?: string;
  ai_session_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  status: string;
  context: Record<string, any>;
  visibility: string;
  shared_with?: string[];
  milestones?: Array<{
    timestamp: string;
    event: string;
    details: Record<string, any>;
    source: string;
  }>;
}

// JSON-RPC types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

export interface JSONRPCResponse<T = any> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
