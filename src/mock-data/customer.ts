/**
 * Mock customer data for SCP demo server
 * Generates realistic customer data for ANY email address
 */

/**
 * Mock customer interface
 */
export interface MockCustomer {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  loyalty?: {
    program_name: string;
    member_id: string;
    member_since: string;
    tier: string;
    points: number;
    lifetime_points?: number;
    benefits: string[];
    next_tier?: {
      name: string;
      points_needed: number;
      benefits: string[];
    };
  };
  preferences?: {
    sizes?: {
      shirt?: string;
      pants?: { waist: number; inseam: number };
      shoe?: string;
    };
    favorite_brands?: string[];
    style_preferences?: string[];
    saved_addresses?: Array<{
      id: string;
      label: string;
      street: string;
      street2?: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      is_default: boolean;
    }>;
    communication?: {
      email_marketing: boolean;
      sms_marketing: boolean;
      push_notifications: boolean;
    };
  };
}

/**
 * Customer profile templates
 */
const LOYALTY_TIERS = [
  {
    tier: 'Bronze',
    points: 250,
    lifetime_points: 250,
    benefits: ['Points on every purchase', 'Exclusive member offers'],
    next_tier: {
      name: 'Silver',
      points_needed: 750,
      benefits: ['All Bronze benefits', 'Free shipping on orders over $50', '10% off regular prices']
    }
  },
  {
    tier: 'Silver',
    points: 750,
    lifetime_points: 1200,
    benefits: ['Free shipping on orders over $50', '10% off regular prices', 'Birthday discount'],
    next_tier: {
      name: 'Gold',
      points_needed: 1250,
      benefits: ['All Silver benefits', 'Free shipping on all orders', '15% off regular prices', 'Early access to sales']
    }
  },
  {
    tier: 'Gold',
    points: 2500,
    lifetime_points: 5000,
    benefits: ['Free shipping on all orders', '15% off regular prices', 'Early access to sales', 'Birthday bonus points'],
    next_tier: {
      name: 'Platinum',
      points_needed: 2500,
      benefits: ['All Gold benefits', '20% off regular prices', 'Exclusive product access', 'Dedicated support line']
    }
  },
  {
    tier: 'Platinum',
    points: 7500,
    lifetime_points: 15000,
    benefits: ['Free shipping on all orders', '20% off regular prices', 'Exclusive product access', 'Dedicated support line', 'Personal shopper'],
    next_tier: undefined
  }
];

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'
];

const BRANDS = ['Ariat', 'Wrangler', 'Justin', 'Cinch', 'Stetson', 'Resistol', 'Lucchese', 'Durango'];
const STYLES = ['Western', 'Classic', 'Modern', 'Casual', 'Work', 'Outdoor'];

const CITIES = [
  { city: 'Austin', state: 'TX', zip: '78701' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'Houston', state: 'TX', zip: '77001' },
  { city: 'San Antonio', state: 'TX', zip: '78205' },
  { city: 'Nashville', state: 'TN', zip: '37201' },
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Denver', state: 'CO', zip: '80202' }
];

/**
 * Mock intent storage (in-memory for demo)
 */
const MOCK_INTENTS: Map<string, any[]> = new Map();

/**
 * Simple hash function for email to get consistent random seed
 */
function hashEmail(email: string): number {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Generate a customer profile from email
 * Same email will always generate the same profile
 */
function generateCustomerFromEmail(email: string): MockCustomer {
  const hash = hashEmail(email);
  const rng = new SeededRandom(hash);
  
  // Generate basic info
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  const customerId = `cust_${hash.toString(36)}`;
  
  // Generate account creation date (within last 2 years)
  const daysAgo = rng.nextInt(30, 730);
  const createdDate = new Date();
  createdDate.setDate(createdDate.getDate() - daysAgo);
  
  // Determine loyalty tier (weighted towards lower tiers)
  const tierRoll = rng.next();
  let loyaltyTier;
  if (tierRoll < 0.4) loyaltyTier = LOYALTY_TIERS[0]; // 40% Bronze
  else if (tierRoll < 0.7) loyaltyTier = LOYALTY_TIERS[1]; // 30% Silver
  else if (tierRoll < 0.9) loyaltyTier = LOYALTY_TIERS[2]; // 20% Gold
  else loyaltyTier = LOYALTY_TIERS[3]; // 10% Platinum
  
  // Generate loyalty member since (between account creation and now)
  const loyaltyDaysAgo = rng.nextInt(0, daysAgo);
  const loyaltySinceDate = new Date();
  loyaltySinceDate.setDate(loyaltySinceDate.getDate() - loyaltyDaysAgo);
  
  const customer: MockCustomer = {
    customer_id: customerId,
    email: email.toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    created_at: createdDate.toISOString(),
    loyalty: {
      program_name: 'VIP Rewards',
      member_id: `VIP-${hash.toString(36).toUpperCase().substring(0, 8)}`,
      member_since: loyaltySinceDate.toISOString().split('T')[0],
      tier: loyaltyTier.tier,
      points: loyaltyTier.points + rng.nextInt(-100, 500),
      lifetime_points: loyaltyTier.lifetime_points,
      benefits: loyaltyTier.benefits,
      next_tier: loyaltyTier.next_tier
    }
  };
  
  // 70% of users have preferences
  if (rng.next() > 0.3) {
    const location = rng.pick(CITIES);
    
    customer.preferences = {
      sizes: {
        shirt: rng.pick(['S', 'M', 'L', 'XL', 'XXL']),
        pants: {
          waist: rng.pick([30, 32, 34, 36, 38, 40]),
          inseam: rng.pick([30, 32, 34])
        },
        shoe: rng.pick(['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'])
      },
      favorite_brands: [
        rng.pick(BRANDS),
        rng.pick(BRANDS.filter(b => b !== customer.preferences!.favorite_brands![0]))
      ],
      style_preferences: [
        rng.pick(STYLES),
        rng.pick(STYLES)
      ],
      saved_addresses: [
        {
          id: 'addr_001',
          label: 'Home',
          street: `${rng.nextInt(100, 9999)} ${rng.pick(['Main', 'Oak', 'Maple', 'Cedar', 'Pine'])} ${rng.pick(['St', 'Ave', 'Blvd', 'Dr'])}`,
          city: location.city,
          state: location.state,
          zip: location.zip,
          country: 'US',
          is_default: true
        }
      ],
      communication: {
        email_marketing: rng.next() > 0.3, // 70% opt-in
        sms_marketing: rng.next() > 0.6,   // 40% opt-in
        push_notifications: rng.next() > 0.7 // 30% opt-in
      }
    };
  }
  
  return customer;
}

/**
 * Get customer by email - generates on the fly if not exists
 */
export async function getCustomerByEmail(email: string): Promise<MockCustomer | null> {
  // Always generate customer for any valid email
  if (!email || !email.includes('@')) {
    return null;
  }
  
  return generateCustomerFromEmail(email);
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<MockCustomer | null> {
  // For demo purposes, we can't reverse the customer_id back to email easily
  // In a real system, you'd query your database by ID
  // For now, we'll return a basic customer
  
  // Try to extract hash from customer_id
  const hashStr = customerId.replace('cust_', '');
  const hash = parseInt(hashStr, 36);
  
  if (isNaN(hash)) {
    return null;
  }
  
  // Generate a synthetic email for this hash
  const syntheticEmail = `customer_${hashStr}@example.com`;
  return generateCustomerFromEmail(syntheticEmail);
}

/**
 * Verify if email exists (always returns true for valid emails in demo mode)
 */
export async function verifyEmail(email: string): Promise<{ exists: boolean; customerId?: string }> {
  if (!email || !email.includes('@')) {
    return { exists: false };
  }
  
  // In demo mode, all valid emails are accepted
  const customer = await getCustomerByEmail(email);
  
  return {
    exists: true,
    customerId: customer?.customer_id
  };
}

/**
 * Store intent for customer
 */
export async function createIntent(
  customerId: string,
  intentData: {
    intent_id: string;
    base_intent: string;
    mechanism: string;
    ai_assistant?: string;
    ai_session_id?: string;
    context: any;
    visibility: string;
    expires_at?: string;
  }
): Promise<void> {
  const intents = MOCK_INTENTS.get(customerId) || [];
  intents.push({
    action: 'scp_intent_created',
    timestamp: new Date().toISOString(),
    data: {
      ...intentData,
      status: 'created',
      source: 'ai_assistant'
    }
  });
  MOCK_INTENTS.set(customerId, intents);
}

/**
 * Update intent
 */
export async function updateIntent(
  customerId: string,
  intentId: string,
  update: {
    status?: string;
    milestone?: any;
    context?: any;
  }
): Promise<void> {
  const intents = MOCK_INTENTS.get(customerId) || [];
  intents.push({
    action: 'scp_intent_updated',
    timestamp: new Date().toISOString(),
    data: {
      intent_id: intentId,
      ...update,
      source: 'ai_assistant'
    }
  });
  MOCK_INTENTS.set(customerId, intents);
}

/**
 * Get intents for customer
 */
export async function getIntents(customerId: string): Promise<any[]> {
  return MOCK_INTENTS.get(customerId) || [];
}
