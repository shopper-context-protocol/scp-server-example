/**
 * JSON-RPC 2.0 request handler
 */

import type { Env, JSONRPCRequest, JSONRPCResponse } from '../types.js';
import { verifyAccessToken } from '../oauth/jwt.js';
import { getCustomerById, getIntents, createIntent as storeIntent, updateIntent as storeUpdate } from '../mock-data/customer.js';
import { getMockOrders } from '../mock-data/orders.js';

/**
 * Handle JSON-RPC request
 */
export async function handleRPCRequest(
  request: JSONRPCRequest,
  accessToken: string,
  env: Env
): Promise<JSONRPCResponse> {
  try {
    // Verify token
    const tokenPayload = await verifyAccessToken(accessToken, env.JWT_SECRET);
    const customerId = tokenPayload.sub;
    const scopes = tokenPayload.scopes;

    // Route to method handler
    const result = await routeMethod(
      request.method,
      request.params || {},
      customerId,
      scopes,
      env
    );

    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  } catch (error: any) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: getErrorCode(error),
        message: error.message,
        data: error.data
      }
    };
  }
}

/**
 * Route RPC method to handler
 */
async function routeMethod(
  method: string,
  params: Record<string, any>,
  customerId: string,
  scopes: string[],
  env: Env
): Promise<any> {
  switch (method) {
    case 'scp.get_orders':
      checkScope(scopes, 'orders');
      return await getOrders(customerId, params);

    case 'scp.get_loyalty':
      checkScope(scopes, 'loyalty');
      return await getLoyalty(customerId);

    case 'scp.get_offers':
      checkScope(scopes, 'offers');
      return await getOffers(customerId, params);

    case 'scp.get_preferences':
      checkScope(scopes, 'preferences');
      return await getPreferences(customerId);

    case 'scp.create_intent':
      checkScope(scopes, 'intent:create');
      return await createIntent(customerId, params);

    case 'scp.get_intents':
      checkScope(scopes, 'intent:read');
      return await getIntentsMethod(customerId, params);

    case 'scp.update_intent':
      checkScope(scopes, 'intent:write');
      return await updateIntent(customerId, params);

    case 'scp.fulfill_intent':
      checkScope(scopes, 'intent:write');
      return await fulfillIntent(customerId, params);

    default:
      throw createError(-32601, 'Method not found');
  }
}

/**
 * SCP method: get_orders
 */
async function getOrders(
  customerId: string,
  params: any
) {
  console.log('[RPC] Getting orders for customer:', customerId);
  
  const customer = await getCustomerById(customerId);
  const email = customer?.email || 'demo@example.com';

  const mockOrders = getMockOrders(email, 50);
  const offset = params.offset || 0;
  const limit = params.limit || 25;
  const paginatedOrders = mockOrders.slice(offset, offset + limit);

  // Convert mock orders to SCP format
  const scpOrders = paginatedOrders.map(order => ({
    order_id: order.order_id,
    order_date: order.order_date,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    items: order.items.map(item => ({
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
      attributes: {
        size: item.size,
        color: item.color
      }
    })),
    shipping_address: order.shipping_address,
    tracking_number: order.tracking_number,
    estimated_delivery: order.estimated_delivery
  }));

  return {
    orders: scpOrders,
    pagination: {
      total: mockOrders.length,
      limit: limit,
      offset: offset,
      has_more: offset + scpOrders.length < mockOrders.length
    }
  };
}

/**
 * SCP method: get_loyalty
 */
async function getLoyalty(customerId: string) {
  console.log('[RPC] Getting loyalty for customer:', customerId);
  
  const customer = await getCustomerById(customerId);
  
  if (!customer?.loyalty) {
    return {
      loyalty: {
        program_name: 'Rewards Program',
        member_id: customerId,
        member_since: new Date().toISOString().split('T')[0],
        tier: 'Bronze',
        points: {
          current: 0,
          lifetime: 0,
          currency_value: 0
        },
        benefits: ['Points on every purchase']
      }
    };
  }

  return {
    loyalty: {
      program_name: customer.loyalty.program_name,
      member_id: customer.loyalty.member_id,
      member_since: customer.loyalty.member_since,
      tier: customer.loyalty.tier,
      points: {
        current: customer.loyalty.points,
        lifetime: customer.loyalty.lifetime_points,
        currency_value: customer.loyalty.points * 0.01 // 1 point = $0.01
      },
      benefits: customer.loyalty.benefits,
      next_tier: customer.loyalty.next_tier
    }
  };
}

/**
 * SCP method: get_offers
 */
async function getOffers(
  customerId: string,
  params: any
) {
  console.log('[RPC] Getting offers for customer:', customerId);
  
  // Return some demo offers
  return {
    offers: [
      {
        offer_id: 'offer_001',
        title: '15% Off Your Next Purchase',
        description: 'Use code SAVE15 at checkout',
        discount_type: 'percentage',
        discount_value: 15,
        code: 'SAVE15',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        minimum_purchase: 50,
        terms: 'Valid on regular priced items only'
      },
      {
        offer_id: 'offer_002',
        title: 'Free Shipping',
        description: 'Free shipping on orders over $75',
        discount_type: 'shipping',
        code: 'FREESHIP',
        minimum_purchase: 75,
        terms: 'Continental US only'
      }
    ]
  };
}

/**
 * SCP method: get_preferences
 */
async function getPreferences(customerId: string) {
  console.log('[RPC] Getting preferences for customer:', customerId);
  
  const customer = await getCustomerById(customerId);
  
  if (!customer?.preferences) {
    return {
      preferences: {
        communication: {
          email_marketing: false,
          sms_marketing: false,
          push_notifications: false
        }
      }
    };
  }

  return { preferences: customer.preferences };
}

/**
 * SCP method: create_intent
 */
async function createIntent(
  customerId: string,
  params: any
) {
  console.log('[RPC] Creating intent for customer:', customerId);
  
  const intentId = params.intent_id || generateIntentId();

  await storeIntent(customerId, {
    intent_id: intentId,
    base_intent: params.base_intent,
    mechanism: params.mechanism || 'conversational_ai',
    ai_assistant: params.ai_assistant,
    ai_session_id: params.ai_session_id,
    context: params.context || {},
    visibility: params.visibility || 'merchant_only',
    expires_at: params.expires_at
  });

  return {
    intent_id: intentId,
    customer_id: customerId,
    created_at: new Date().toISOString(),
    status: 'created'
  };
}

/**
 * SCP method: get_intents
 */
async function getIntentsMethod(
  customerId: string,
  params: any
) {
  console.log('[RPC] Getting intents for customer:', customerId);
  
  const activities = await getIntents(customerId);
  const intents = transformIntentsToSCP(customerId, activities);

  // Apply status filter if provided
  let filtered = intents;
  if (params.status) {
    const statusArray = Array.isArray(params.status) ? params.status : [params.status];
    filtered = intents.filter(i => statusArray.includes(i.status));
  }

  return {
    intents: filtered.slice(0, params.limit || 10),
    pagination: {
      total: filtered.length,
      limit: params.limit || 10,
      offset: params.offset || 0,
      has_more: filtered.length > (params.limit || 10)
    }
  };
}

/**
 * SCP method: update_intent
 */
async function updateIntent(
  customerId: string,
  params: any
) {
  console.log('[RPC] Updating intent for customer:', customerId);
  
  await storeUpdate(customerId, params.intent_id, {
    status: params.status,
    milestone: params.add_milestone,
    context: params.context
  });

  return {
    intent_id: params.intent_id,
    updated_at: new Date().toISOString(),
    status: params.status || 'active'
  };
}

/**
 * SCP method: fulfill_intent
 */
async function fulfillIntent(
  customerId: string,
  params: any
) {
  console.log('[RPC] Fulfilling intent for customer:', customerId);
  
  await storeUpdate(customerId, params.intent_id, {
    status: 'fulfilled',
    context: {
      fulfillment_type: params.fulfillment_type || 'purchase',
      order_ids: params.order_ids,
      notes: params.notes
    }
  });

  return {
    intent_id: params.intent_id,
    status: 'fulfilled',
    fulfilled_at: new Date().toISOString()
  };
}

/**
 * Transform intent activities to SCP format
 */
function transformIntentsToSCP(
  customerId: string,
  activities: any[]
): any[] {
  // Group activities by intent_id
  const intentMap = new Map<string, {
    created: any;
    updates: any[];
  }>();

  for (const activity of activities) {
    if (!activity.data?.intent_id) continue;

    const intentId = activity.data.intent_id;

    if (activity.action === 'scp_intent_created') {
      intentMap.set(intentId, {
        created: activity,
        updates: []
      });
    } else if (intentMap.has(intentId)) {
      intentMap.get(intentId)!.updates.push(activity);
    }
  }

  // Transform to SCP intent objects
  const intents: any[] = [];

  for (const [intentId, data] of intentMap) {
    const created = data.created;
    const milestones = [
      {
        timestamp: created.timestamp,
        event: 'created',
        details: created.data,
        source: created.data.source || 'merchant'
      },
      ...data.updates.map(update => ({
        timestamp: update.timestamp,
        event: update.action.replace('scp_intent_', ''),
        details: update.data,
        source: update.data.source || 'merchant'
      }))
    ];

    // Find latest status
    let status = 'created';
    let updatedAt = created.timestamp;

    for (const update of data.updates) {
      if (update.data.status) {
        status = update.data.status;
        updatedAt = update.timestamp;
      }
    }

    intents.push({
      intent_id: intentId,
      customer_id: customerId,
      base_intent: created.data.base_intent || '',
      mechanism: created.data.mechanism || 'conversational_ai',
      ai_assistant: created.data.ai_assistant,
      ai_session_id: created.data.ai_session_id,
      created_at: created.timestamp,
      updated_at: updatedAt,
      expires_at: created.data.expires_at,
      status,
      context: created.data.context || {},
      visibility: created.data.visibility || 'merchant_only',
      shared_with: created.data.shared_with,
      milestones
    });
  }

  return intents;
}

/**
 * Generate unique intent ID
 */
function generateIntentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `intent_${timestamp}_${random}`;
}

/**
 * Check if scope is granted
 */
function checkScope(scopes: string[], required: string): void {
  if (!scopes.includes(required)) {
    throw createError(-32001, `Forbidden: missing scope '${required}'`);
  }
}

/**
 * Create JSON-RPC error
 */
function createError(code: number, message: string, data?: any): Error {
  const error = new Error(message) as any;
  error.code = code;
  error.data = data;
  return error;
}

/**
 * Get error code from error
 */
function getErrorCode(error: any): number {
  if (error.code) return error.code;
  if (error.message?.includes('expired')) return -32000;
  if (error.message?.includes('Invalid')) return -32000;
  return -32603; // Internal error
}
