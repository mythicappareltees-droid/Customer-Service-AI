// Shopify API Integration for Order Lookups
const Shopify = require('shopify-api-node');

let shopify = null;

function initShopify() {
  if (!process.env.SHOPIFY_SHOP_NAME || !process.env.SHOPIFY_ACCESS_TOKEN) {
    console.warn('⚠️  Shopify credentials not configured - order lookups disabled');
    return null;
  }
  
  shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
  });
  
  console.log('✅ Shopify connected');
  return shopify;
}

// Extract order number from email text
function extractOrderNumber(text) {
  // Match patterns like #1234, Order 1234, order #1234, etc.
  const patterns = [
    /#(\d{4,})/,
    /order\s*#?\s*(\d{4,})/i,
    /order\s+number[:\s]*#?(\d{4,})/i,
    /confirmation[:\s]*#?(\d{4,})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Extract email from text (for customer lookup)
function extractEmail(text) {
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const match = text.match(emailPattern);
  return match ? match[0] : null;
}

// Look up order by order number
async function getOrderByNumber(orderNumber) {
  if (!shopify) return null;
  
  try {
    const orders = await shopify.order.list({
      name: orderNumber,
      status: 'any'
    });
    
    if (orders.length > 0) {
      return formatOrderData(orders[0]);
    }
    
    // Try with # prefix
    const ordersWithHash = await shopify.order.list({
      name: `#${orderNumber}`,
      status: 'any'
    });
    
    if (ordersWithHash.length > 0) {
      return formatOrderData(ordersWithHash[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Shopify order lookup error:', error.message);
    return null;
  }
}

// Look up orders by customer email
async function getOrdersByEmail(email) {
  if (!shopify) return [];
  
  try {
    const orders = await shopify.order.list({
      email: email,
      status: 'any',
      limit: 5
    });
    
    return orders.map(formatOrderData);
  } catch (error) {
    console.error('Shopify email lookup error:', error.message);
    return [];
  }
}

// Format order data for AI context
function formatOrderData(order) {
  const fulfillment = order.fulfillments?.[0];
  const tracking = fulfillment?.tracking_number;
  const trackingUrl = fulfillment?.tracking_url;
  const carrier = fulfillment?.tracking_company;
  
  let status = 'Processing';
  if (order.cancelled_at) {
    status = 'Cancelled';
  } else if (order.fulfillment_status === 'fulfilled') {
    status = 'Shipped';
  } else if (order.fulfillment_status === 'partial') {
    status = 'Partially Shipped';
  }
  
  return {
    order_number: order.name,
    order_id: order.id,
    status: status,
    created_at: new Date(order.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
    customer_email: order.email,
    total: `$${order.total_price}`,
    items: order.line_items.map(item => ({
      name: item.title,
      quantity: item.quantity,
      variant: item.variant_title
    })),
    shipping_address: order.shipping_address ? {
      city: order.shipping_address.city,
      state: order.shipping_address.province,
      zip: order.shipping_address.zip
    } : null,
    tracking: tracking ? {
      number: tracking,
      carrier: carrier,
      url: trackingUrl
    } : null,
    note: order.note,
    tags: order.tags,
    financial_status: order.financial_status
  };
}

// Get customer info and order history
async function getCustomerContext(email) {
  if (!shopify) return null;
  
  try {
    const customers = await shopify.customer.search({
      query: `email:${email}`
    });
    
    if (customers.length === 0) return null;
    
    const customer = customers[0];
    const orders = await getOrdersByEmail(email);
    
    return {
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      email: customer.email,
      total_orders: customer.orders_count,
      total_spent: `$${customer.total_spent}`,
      created_at: new Date(customer.created_at).toLocaleDateString(),
      tags: customer.tags,
      recent_orders: orders.slice(0, 3)
    };
  } catch (error) {
    console.error('Customer lookup error:', error.message);
    return null;
  }
}

module.exports = {
  initShopify,
  extractOrderNumber,
  extractEmail,
  getOrderByNumber,
  getOrdersByEmail,
  getCustomerContext
};
