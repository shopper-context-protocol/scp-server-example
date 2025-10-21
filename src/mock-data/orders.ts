/**
 * Mock order data for testing
 * Generates realistic product orders over the last 90 days
 */

export interface MockOrder {
  order_id: string;
  customer_email: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  total_amount: number;
  currency: string;
  items: MockOrderItem[];
  shipping_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  tracking_number?: string;
  estimated_delivery?: string;
}

export interface MockOrderItem {
  sku: string;
  name: string;
  brand: string;
  category: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

/**
 * Boot Barn product catalog
 */
const BOOT_BARN_PRODUCTS = [
  // Boots
  { sku: 'BB-ARIAT-001', name: 'Ariat Heritage Western Boot', brand: 'Ariat', category: 'Boots', price: 149.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Brown', 'Black'] },
  { sku: 'BB-JUSTIN-002', name: 'Justin Bent Rail Cowboy Boot', brand: 'Justin', category: 'Boots', price: 189.99, sizes: ['8', '9', '10', '11', '12'], colors: ['Tan', 'Dark Brown'] },
  { sku: 'BB-LUCCHESE-003', name: 'Lucchese Classic Western Boot', brand: 'Lucchese', category: 'Boots', price: 399.99, sizes: ['8', '9', '10', '11'], colors: ['Black', 'Cognac'] },
  { sku: 'BB-DURANGO-004', name: 'Durango Work Boot', brand: 'Durango', category: 'Boots', price: 99.99, sizes: ['8', '9', '10', '11', '12', '13'], colors: ['Brown', 'Black'] },
  { sku: 'BB-LAREDO-005', name: 'Laredo Ladies Western Boot', brand: 'Laredo', category: 'Boots', price: 119.99, sizes: ['6', '7', '8', '9', '10'], colors: ['Tan', 'Red', 'Turquoise'] },

  // Hats
  { sku: 'BB-STETSON-101', name: 'Stetson Skyline 6X Cowboy Hat', brand: 'Stetson', category: 'Hats', price: 199.99, sizes: ['7', '7 1/4', '7 1/2', '7 3/4'], colors: ['Silverbelly', 'Black'] },
  { sku: 'BB-RESISTOL-102', name: 'Resistol George Strait Cowboy Hat', brand: 'Resistol', category: 'Hats', price: 179.99, sizes: ['7', '7 1/4', '7 1/2'], colors: ['Natural', 'Black'] },
  { sku: 'BB-BAILEY-103', name: 'Bailey Western Wool Hat', brand: 'Bailey', category: 'Hats', price: 89.99, sizes: ['7', '7 1/4', '7 1/2', '7 3/4'], colors: ['Brown', 'Black', 'Grey'] },

  // Jeans
  { sku: 'BB-WRANGLER-201', name: 'Wrangler 20X Competition Jean', brand: 'Wrangler', category: 'Jeans', price: 59.99, sizes: ['30x32', '32x32', '32x34', '34x32', '34x34', '36x34'], colors: ['Dark Wash', 'Light Wash'] },
  { sku: 'BB-CINCH-202', name: 'Cinch Silver Label Jean', brand: 'Cinch', category: 'Jeans', price: 79.99, sizes: ['30x32', '32x32', '32x34', '34x32', '34x34'], colors: ['Dark Rinse', 'Medium Wash'] },
  { sku: 'BB-CRUEL-203', name: 'Cruel Girl Georgia Bootcut Jean', brand: 'Cruel Girl', category: 'Jeans', price: 69.99, sizes: ['0', '2', '4', '6', '8', '10'], colors: ['Dark Wash', 'Medium Wash'] },

  // Shirts
  { sku: 'BB-ARIAT-301', name: 'Ariat Classic Western Shirt', brand: 'Ariat', category: 'Shirts', price: 49.99, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Blue Plaid', 'Red Plaid', 'Black'] },
  { sku: 'BB-CINCH-302', name: 'Cinch Modern Fit Shirt', brand: 'Cinch', category: 'Shirts', price: 59.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Blue Print', 'Purple Print', 'Green Print'] },
  { sku: 'BB-WRANGLER-303', name: 'Wrangler George Strait Shirt', brand: 'Wrangler', category: 'Shirts', price: 44.99, sizes: ['M', 'L', 'XL', 'XXL'], colors: ['White', 'Light Blue', 'Tan'] },

  // Accessories
  { sku: 'BB-NOCONA-401', name: 'Nocona Leather Belt', brand: 'Nocona', category: 'Belts', price: 39.99, sizes: ['32', '34', '36', '38', '40', '42'], colors: ['Brown', 'Black', 'Tan'] },
  { sku: 'BB-MONTANA-402', name: 'Montana Silversmiths Buckle', brand: 'Montana Silversmiths', category: 'Buckles', price: 49.99, sizes: ['One Size'], colors: ['Silver', 'Gold'] },
];

/**
 * Generate random order items
 */
function generateOrderItems(itemCount: number): MockOrderItem[] {
  const items: MockOrderItem[] = [];
  const usedSkus = new Set<string>();

  for (let i = 0; i < itemCount; i++) {
    let product;
    // Ensure unique products in order
    do {
      product = BOOT_BARN_PRODUCTS[Math.floor(Math.random() * BOOT_BARN_PRODUCTS.length)];
    } while (usedSkus.has(product.sku) && usedSkus.size < BOOT_BARN_PRODUCTS.length);

    usedSkus.add(product.sku);

    const quantity = Math.random() > 0.8 ? 2 : 1; // 20% chance of quantity 2
    const size = product.sizes ? product.sizes[Math.floor(Math.random() * product.sizes.length)] : undefined;
    const color = product.colors ? product.colors[Math.floor(Math.random() * product.colors.length)] : undefined;

    items.push({
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
      quantity,
      price: product.price,
      size,
      color
    });
  }

  return items;
}

/**
 * Generate mock shipping address
 */
function generateShippingAddress(): MockOrder['shipping_address'] {
  const addresses = [
    { street: '123 Ranch Road', city: 'Austin', state: 'TX', zip: '78701' },
    { street: '456 Cowboy Trail', city: 'Dallas', state: 'TX', zip: '75201' },
    { street: '789 Western Ave', city: 'Houston', state: 'TX', zip: '77001' },
    { street: '321 Rodeo Drive', city: 'Fort Worth', state: 'TX', zip: '76102' },
    { street: '654 Prairie Lane', city: 'San Antonio', state: 'TX', zip: '78205' },
    { street: '987 Frontier Blvd', city: 'Nashville', state: 'TN', zip: '37201' },
    { street: '147 Boot Hill', city: 'Phoenix', state: 'AZ', zip: '85001' },
    { street: '258 Cattle Drive', city: 'Denver', state: 'CO', zip: '80202' },
  ];

  const address = addresses[Math.floor(Math.random() * addresses.length)];
  return { ...address, country: 'USA' };
}

/**
 * Generate a random date within the last N days
 */
function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime);
}

/**
 * Generate mock orders for a customer
 */
export function generateMockOrders(customerEmail: string, count: number = 10): MockOrder[] {
  const orders: MockOrder[] = [];
  const statuses: MockOrder['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

  // Weight statuses (more delivered orders, fewer cancelled/returned)
  const statusWeights = [0.05, 0.1, 0.15, 0.6, 0.05, 0.05]; // Must sum to 1.0

  for (let i = 0; i < count; i++) {
    // Select status based on weights
    const rand = Math.random();
    let cumulative = 0;
    let status: MockOrder['status'] = 'delivered';
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (rand <= cumulative) {
        status = statuses[j];
        break;
      }
    }

    const orderDate = randomDateWithinDays(90);
    const items = generateOrderItems(Math.floor(Math.random() * 3) + 1); // 1-3 items per order
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Generate tracking number for shipped/delivered orders
    let trackingNumber: string | undefined;
    let estimatedDelivery: string | undefined;
    if (status === 'shipped' || status === 'delivered') {
      trackingNumber = `1Z${Math.random().toString(36).substring(2, 18).toUpperCase()}`;

      if (status === 'shipped') {
        // Estimated delivery 3-7 days from order date
        const deliveryDate = new Date(orderDate);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 5) + 3);
        estimatedDelivery = deliveryDate.toISOString();
      }
    }

    const order: MockOrder = {
      order_id: `BB${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
      customer_email: customerEmail,
      order_date: orderDate.toISOString(),
      status,
      total_amount: Math.round(totalAmount * 100) / 100,
      currency: 'USD',
      items,
      shipping_address: generateShippingAddress(),
      tracking_number: trackingNumber,
      estimated_delivery: estimatedDelivery
    };

    orders.push(order);
  }

  // Sort by order date (newest first)
  return orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
}

/**
 * Get mock orders (for testing)
 */
export function getMockOrders(customerEmail: string, limit: number = 25): MockOrder[] {
  const allOrders = generateMockOrders(customerEmail, 15); // Generate 15 orders
  return allOrders.slice(0, limit);
}
