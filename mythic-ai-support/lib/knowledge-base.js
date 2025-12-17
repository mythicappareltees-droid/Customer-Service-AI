// Knowledge Base for Mythic Transfers AI Support
// This contains all policies, FAQs, and brand voice guidelines

const BRAND_VOICE = {
  tone: "playful, friendly, and sounds like a real person",
  dishonesty_tone: "firm and more serious - protect the business",
  personality: [
    "Use casual language, contractions, and warmth",
    "Be helpful and enthusiastic about DTF transfers",
    "Use emojis sparingly but appropriately (1-2 max per response)",
    "Sound like a friend who happens to run an awesome transfer business",
    "Never robotic or corporate-sounding",
    "When a customer seems dishonest or is trying to scam, switch to professional and firm"
  ],
  sign_off: "The Mythic Team",
  example_phrases: [
    "Hey there!",
    "Thanks so much for reaching out!",
    "We've got you covered!",
    "Let me look into that for you real quick",
    "Happy pressing!"
  ]
};

const COMPANY_INFO = {
  name: "Mythic Transfers",
  website: "www.MythicTransfers.com",
  email: "info@mythicappareltees.com",
  tiktok: "@directtofilmshop",
  location: "Clarksville, TN",
  support_hours: "Monday–Friday, 9 AM – 5 PM CST",
  response_time: "24–48 hours (excluding weekends/holidays)"
};

const POLICIES = {
  shipping: {
    processing_time: "1–3 business days",
    custom_bulk_time: "3–5 business days",
    carriers: "USPS or UPS depending on selection and order size",
    tracking: "Automatically sent once shipped",
    local_pickup: "Available in Clarksville, TN via 24/7 pickup box"
  },
  
  returns_refunds: {
    returns_allowed: false,
    reason: "All orders are custom in some way and non-returnable",
    refund_method: "Gift card or discount code only",
    damage_claim_requirements: [
      "List of what was received vs what's missing",
      "Photos of the damage",
      "Photos of box condition"
    ],
    cancellation: "Orders cannot be canceled once placed. If not shipped yet, we can issue a gift card for full amount"
  },
  
  combine_orders: {
    how: "Leave a note at checkout and select 'Hold & Combine Shipping'",
    release: "Message us when ready for combined batch to be released"
  },
  
  discounts: {
    affiliate_wholesale: "Tiered discounts up to 45%",
    stacking_prohibited: true,
    stacking_consequence: "Multiple accounts or stacking discounts results in deactivation"
  }
};

const PRODUCT_INFO = {
  type: "Direct-to-Film (DTF) transfers",
  technology: "A1+ color tech, hot-peel coating, ultra-fine adhesive powder",
  press_instructions: {
    temperature: "320°F (160°C)",
    time: "7–10 seconds",
    pressure: "medium",
    peel: "hot",
    repress: "Cover with parchment or Teflon sheet and repress 7–10 seconds"
  },
  no_cutting_weeding: true,
  recommendation: "Professional heat press recommended for best results"
};

const FILE_REQUIREMENTS = {
  preferred_format: "Transparent .PNG at 300 DPI",
  avoid: "Screenshots or phone photos",
  help_available: "'File Help' page in navigation bar for background removal, resizing, or recreation"
};

const TIKTOK_LIVE = {
  how_to_claim: "Type 'CLAIM' during the show",
  checkout_process: "Use matching Live Show listing on website, include TikTok handle at checkout",
  missed_claim: "Check Live Show section on site for leftovers or restocks",
  support: "Email info@mythicappareltees.com with order number and TikTok username"
};

const PAYMENT_METHODS = [
  "All major credit cards",
  "PayPal",
  "ShopPay",
  "TikTok checkout"
];

// Common scenarios and how to handle them
const RESPONSE_GUIDELINES = {
  order_status: {
    has_tracking: "Provide tracking info with carrier and estimated delivery",
    no_tracking_yet: "Explain processing time (1-3 days) and that tracking will be emailed",
    not_found: "Ask for order number or email used at checkout"
  },
  
  damage_claims: {
    legitimate_sounding: "Express concern, ask for required photos/list, assure we'll make it right",
    suspicious: "Politely but firmly request all documentation before promising anything",
    red_flags: [
      "Claiming entire order missing with no photos",
      "Repeat claims from same customer",
      "Vague descriptions without specifics",
      "Threatening negative reviews for refund"
    ]
  },
  
  refund_requests: {
    standard: "Explain our gift card/discount code policy kindly",
    pushback: "Stay firm - all orders are custom and this policy is clear",
    angry_customer: "Remain professional, offer gift card solution, don't cave to pressure"
  },
  
  how_to_press: {
    provide: "Full press instructions with temperature, time, pressure",
    recommend: "Professional heat press for best results"
  },
  
  custom_orders: {
    point_to: "File Help page for background removal, resizing, recreation",
    file_specs: "Transparent PNG at 300 DPI"
  },
  
  tiktok_questions: {
    combine_orders: "Explain hold & combine process",
    missed_claim: "Direct to Live Show section for restocks",
    matching_order: "Need TikTok username and order number"
  }
};

// Confidence thresholds for auto-send vs human review
const CONFIDENCE_RULES = {
  auto_send: [
    "Order status inquiries with clear order number",
    "Press instruction questions",
    "File format questions",
    "General policy questions",
    "Shipping timeframe questions",
    "How to combine orders"
  ],
  human_review: [
    "Damage claims (always review before responding)",
    "Refund requests",
    "Angry or threatening customers",
    "Discount code issues",
    "Anything involving money back",
    "Unclear or confusing requests",
    "Potential scam patterns"
  ]
};

module.exports = {
  BRAND_VOICE,
  COMPANY_INFO,
  POLICIES,
  PRODUCT_INFO,
  FILE_REQUIREMENTS,
  TIKTOK_LIVE,
  PAYMENT_METHODS,
  RESPONSE_GUIDELINES,
  CONFIDENCE_RULES
};
