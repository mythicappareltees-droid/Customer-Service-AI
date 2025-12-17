// Claude AI Integration for Intelligent Responses
const Anthropic = require('@anthropic-ai/sdk');
const { 
  BRAND_VOICE, 
  COMPANY_INFO, 
  POLICIES, 
  PRODUCT_INFO, 
  FILE_REQUIREMENTS,
  TIKTOK_LIVE,
  PAYMENT_METHODS,
  RESPONSE_GUIDELINES,
  CONFIDENCE_RULES 
} = require('./knowledge-base');

let anthropic = null;

function initAI() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }
  
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  console.log('✅ Claude AI connected');
  return anthropic;
}

// Build the system prompt with all knowledge
function buildSystemPrompt() {
  return `You are the AI customer support assistant for Mythic Transfers, a Direct-to-Film (DTF) transfer business.

## YOUR PERSONALITY & TONE
${BRAND_VOICE.tone}

Guidelines:
${BRAND_VOICE.personality.map(p => `- ${p}`).join('\n')}

Sign off emails as: "${BRAND_VOICE.sign_off}"

## COMPANY INFO
- Website: ${COMPANY_INFO.website}
- Email: ${COMPANY_INFO.email}
- TikTok: ${COMPANY_INFO.tiktok}
- Location: ${COMPANY_INFO.location}
- Support Hours: ${COMPANY_INFO.support_hours}

## SHIPPING POLICIES
- Processing: ${POLICIES.shipping.processing_time} (custom/bulk: ${POLICIES.shipping.custom_bulk_time})
- Carriers: ${POLICIES.shipping.carriers}
- Tracking: ${POLICIES.shipping.tracking}
- Local Pickup: ${POLICIES.shipping.local_pickup}

## RETURNS & REFUNDS (IMPORTANT - BE FIRM)
- Returns: NOT ALLOWED - ${POLICIES.returns_refunds.reason}
- Refunds: ${POLICIES.returns_refunds.refund_method} - NO EXCEPTIONS
- For damage claims, REQUIRE: ${POLICIES.returns_refunds.damage_claim_requirements.join(', ')}
- Cancellation: ${POLICIES.returns_refunds.cancellation}

## PRODUCT INFO
- Type: ${PRODUCT_INFO.type}
- Technology: ${PRODUCT_INFO.technology}
- Press Instructions: ${PRODUCT_INFO.press_instructions.temperature} for ${PRODUCT_INFO.press_instructions.time}, ${PRODUCT_INFO.press_instructions.pressure} pressure, ${PRODUCT_INFO.press_instructions.peel} peel
- Repress: ${PRODUCT_INFO.press_instructions.repress}
- No cutting or weeding required
- ${PRODUCT_INFO.recommendation}

## FILE REQUIREMENTS
- Format: ${FILE_REQUIREMENTS.preferred_format}
- Avoid: ${FILE_REQUIREMENTS.avoid}
- Help: ${FILE_REQUIREMENTS.help_available}

## TIKTOK LIVE
- How to claim: ${TIKTOK_LIVE.how_to_claim}
- Checkout: ${TIKTOK_LIVE.checkout_process}
- Missed claims: ${TIKTOK_LIVE.missed_claim}

## COMBINE ORDERS
- How: ${POLICIES.combine_orders.how}
- Release: ${POLICIES.combine_orders.release}

## DISCOUNT POLICY (BE STRICT)
- Affiliate/Wholesale: ${POLICIES.discounts.affiliate_wholesale}
- Stacking discounts or multiple accounts is PROHIBITED and results in deactivation

## SCAM/DISHONESTY RED FLAGS
Watch for these and be FIRM (not rude, but serious):
${RESPONSE_GUIDELINES.damage_claims.red_flags.map(f => `- ${f}`).join('\n')}

## RESPONSE RULES
1. Always be helpful but protect the business
2. For order status: provide tracking if available, otherwise explain processing times
3. For damage claims: ALWAYS require photos and list of items before promising anything
4. For refunds: stick to gift card/discount code policy - no cash refunds
5. For angry customers: stay professional, don't cave to pressure
6. If unsure about something, say you'll look into it rather than making things up
7. Keep responses concise but warm - don't write novels
8. Include order info when you have it

## CONFIDENCE FLAGGING
At the END of your response, on a new line, add one of these flags:
[AUTO-SEND] - Safe to send automatically (routine questions, clear answers)
[HUMAN-REVIEW] - Needs human review before sending (refunds, damage claims, angry customers, anything involving money)

The flag should NOT be visible in the customer email - it's for internal routing only.`;
}

// Generate AI response
async function generateResponse(emailData, orderContext = null, customerContext = null) {
  if (!anthropic) {
    throw new Error('AI not initialized');
  }
  
  // Build context message
  let contextInfo = '';
  
  if (orderContext) {
    contextInfo += `\n\n## ORDER DATA FOUND
Order: ${orderContext.order_number}
Status: ${orderContext.status}
Placed: ${orderContext.created_at}
Total: ${orderContext.total}
Items: ${orderContext.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
${orderContext.tracking ? `Tracking: ${orderContext.tracking.carrier} - ${orderContext.tracking.number}\nTrack here: ${orderContext.tracking.url}` : 'Tracking: Not yet shipped'}
${orderContext.note ? `Customer Note: ${orderContext.note}` : ''}`;
  }
  
  if (customerContext) {
    contextInfo += `\n\n## CUSTOMER HISTORY
Name: ${customerContext.name}
Total Orders: ${customerContext.total_orders}
Total Spent: ${customerContext.total_spent}
Customer Since: ${customerContext.created_at}
${customerContext.tags ? `Tags: ${customerContext.tags}` : ''}`;
  }
  
  const userMessage = `## INCOMING CUSTOMER EMAIL

From: ${emailData.from}
Subject: ${emailData.subject}

Message:
${emailData.body}
${contextInfo}

---
Write a helpful response to this customer. Remember to add the confidence flag at the end.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: [
        { role: 'user', content: userMessage }
      ]
    });
    
    const fullResponse = response.content[0].text;
    
    // Parse out the confidence flag
    const autoSendMatch = fullResponse.match(/\[AUTO-SEND\]/);
    const humanReviewMatch = fullResponse.match(/\[HUMAN-REVIEW\]/);
    
    // Remove the flag from the customer-facing response
    const cleanResponse = fullResponse
      .replace(/\[AUTO-SEND\]/g, '')
      .replace(/\[HUMAN-REVIEW\]/g, '')
      .trim();
    
    return {
      response: cleanResponse,
      requiresReview: humanReviewMatch !== null,
      autoSend: autoSendMatch !== null && !humanReviewMatch,
      rawResponse: fullResponse
    };
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}

// Analyze email for intent and urgency
async function analyzeEmail(emailData) {
  if (!anthropic) {
    throw new Error('AI not initialized');
  }
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Analyze this customer email and return JSON only:

From: ${emailData.from}
Subject: ${emailData.subject}
Body: ${emailData.body}

Return this exact JSON structure:
{
  "intent": "order_status|damage_claim|refund_request|how_to_press|file_help|tiktok_question|combine_orders|general_question|complaint|other",
  "urgency": "low|medium|high",
  "sentiment": "positive|neutral|frustrated|angry",
  "has_order_number": true/false,
  "potential_scam_indicators": true/false,
  "summary": "one sentence summary"
}`
        }
      ]
    });
    
    const text = response.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Email analysis error:', error);
    return null;
  }
}

module.exports = {
  initAI,
  generateResponse,
  analyzeEmail
};
