// Mythic AI Support - Main Server
require('dotenv').config();

const express = require('express');
const { initShopify, extractOrderNumber, extractEmail, getOrderByNumber, getOrdersByEmail, getCustomerContext } = require('./lib/shopify');
const { initEmail, parseInboundEmail, sendEmail, queueForReview, getReviewQueue, approveAndSend, rejectFromQueue } = require('./lib/email');
const { initAI, generateResponse, analyzeEmail } = require('./lib/ai');

const app = express();
app.use(express.json());

// Initialize services
console.log('🚀 Starting Mythic AI Support...\n');

initAI();
initEmail();
initShopify();

console.log('\n✅ All services initialized\n');

// ===========================================
// WEBHOOK: Incoming Email from Postmark
// ===========================================
app.post('/webhook/inbound', async (req, res) => {
  console.log('\n📨 Incoming email received');
  
  try {
    // Parse the incoming email
    const emailData = parseInboundEmail(req.body);
    console.log(`From: ${emailData.from}`);
    console.log(`Subject: ${emailData.subject}`);
    
    // Analyze the email for intent
    const analysis = await analyzeEmail(emailData);
    console.log(`Intent: ${analysis?.intent || 'unknown'}`);
    console.log(`Sentiment: ${analysis?.sentiment || 'unknown'}`);
    
    // Try to find order context
    let orderContext = null;
    let customerContext = null;
    
    // Extract order number from email
    const orderNumber = extractOrderNumber(emailData.body) || extractOrderNumber(emailData.subject);
    if (orderNumber) {
      console.log(`Order number found: ${orderNumber}`);
      orderContext = await getOrderByNumber(orderNumber);
    }
    
    // Get customer context by email
    customerContext = await getCustomerContext(emailData.from);
    if (customerContext) {
      console.log(`Customer found: ${customerContext.name} (${customerContext.total_orders} orders)`);
    }
    
    // Generate AI response
    const aiResult = await generateResponse(emailData, orderContext, customerContext);
    console.log(`AI Response generated - Auto-send: ${aiResult.autoSend}`);
    
    // Route based on confidence
    if (aiResult.autoSend && !aiResult.requiresReview) {
      // Safe to auto-send
      console.log('✅ Auto-sending response...');
      await sendEmail({
        to: emailData.from,
        subject: emailData.subject,
        body: aiResult.response,
        replyToMessageId: emailData.messageId
      });
      console.log('📧 Response sent automatically');
    } else {
      // Queue for human review
      console.log('⏸️  Queuing for human review...');
      queueForReview(emailData, aiResult, analysis);
    }
    
    res.status(200).json({ status: 'processed' });
    
  } catch (error) {
    console.error('❌ Error processing email:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================
// REVIEW DASHBOARD API
// ===========================================

// Get pending reviews
app.get('/api/review', (req, res) => {
  const queue = getReviewQueue();
  res.json({
    count: queue.length,
    items: queue.map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      from: item.email.from,
      subject: item.email.subject,
      preview: item.email.body.substring(0, 200),
      intent: item.analysis?.intent,
      sentiment: item.analysis?.sentiment,
      aiResponse: item.aiResponse.response
    }))
  });
});

// Get single review item
app.get('/api/review/:id', (req, res) => {
  const queue = getReviewQueue();
  const item = queue.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    id: item.id,
    timestamp: item.timestamp,
    email: item.email,
    analysis: item.analysis,
    aiResponse: item.aiResponse
  });
});

// Approve and send
app.post('/api/review/:id/approve', async (req, res) => {
  try {
    const { modifiedResponse } = req.body;
    const result = await approveAndSend(req.params.id, modifiedResponse);
    
    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ status: 'sent', messageId: result.MessageID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject
app.post('/api/review/:id/reject', (req, res) => {
  const result = rejectFromQueue(req.params.id);
  
  if (!result) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({ status: 'rejected' });
});

// ===========================================
// SIMPLE REVIEW DASHBOARD UI
// ===========================================
app.get('/dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Mythic Support - Review Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #1a1a2e; 
      color: #eee; 
      padding: 20px;
      min-height: 100vh;
    }
    h1 { color: #ff6b9d; margin-bottom: 20px; }
    .queue-count { 
      background: #16213e; 
      padding: 15px 20px; 
      border-radius: 10px; 
      margin-bottom: 20px;
      display: inline-block;
    }
    .queue-count span { color: #ff6b9d; font-size: 24px; font-weight: bold; }
    .email-card {
      background: #16213e;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 15px;
      border-left: 4px solid #ff6b9d;
    }
    .email-header { margin-bottom: 15px; }
    .email-from { font-weight: bold; color: #ff6b9d; }
    .email-subject { font-size: 18px; margin: 5px 0; }
    .email-meta { font-size: 12px; color: #888; }
    .email-body {
      background: #0f0f23;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
      white-space: pre-wrap;
      font-size: 14px;
      max-height: 200px;
      overflow-y: auto;
    }
    .ai-response {
      background: #1a3a1a;
      border: 1px solid #2d5a2d;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .ai-response h4 { color: #6bff6b; margin-bottom: 10px; }
    .ai-response textarea {
      width: 100%;
      min-height: 150px;
      background: #0f0f23;
      color: #eee;
      border: 1px solid #333;
      border-radius: 5px;
      padding: 10px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
    }
    .actions { display: flex; gap: 10px; margin-top: 15px; }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      transition: transform 0.1s;
    }
    .btn:hover { transform: scale(1.05); }
    .btn-approve { background: #4CAF50; color: white; }
    .btn-reject { background: #f44336; color: white; }
    .btn-refresh { background: #2196F3; color: white; }
    .sentiment { 
      display: inline-block; 
      padding: 3px 8px; 
      border-radius: 4px; 
      font-size: 12px; 
      margin-left: 10px;
    }
    .sentiment-angry { background: #f44336; }
    .sentiment-frustrated { background: #ff9800; }
    .sentiment-neutral { background: #607d8b; }
    .sentiment-positive { background: #4CAF50; }
    .intent-tag {
      display: inline-block;
      background: #ff6b9d;
      color: #1a1a2e;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 10px;
    }
    .empty-state {
      text-align: center;
      padding: 60px;
      color: #666;
    }
    .empty-state span { font-size: 48px; display: block; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>✨ Mythic Support Dashboard</h1>
  
  <div class="queue-count">
    Pending Reviews: <span id="count">0</span>
    <button class="btn btn-refresh" onclick="loadQueue()" style="margin-left: 15px;">Refresh</button>
  </div>
  
  <div id="queue"></div>
  
  <script>
    async function loadQueue() {
      const res = await fetch('/api/review');
      const data = await res.json();
      
      document.getElementById('count').textContent = data.count;
      
      if (data.count === 0) {
        document.getElementById('queue').innerHTML = \`
          <div class="empty-state">
            <span>🎉</span>
            <p>All caught up! No emails pending review.</p>
          </div>
        \`;
        return;
      }
      
      document.getElementById('queue').innerHTML = data.items.map(item => \`
        <div class="email-card" id="card-\${item.id}">
          <div class="email-header">
            <div class="email-from">\${item.from}</div>
            <div class="email-subject">
              \${item.subject}
              <span class="intent-tag">\${item.intent || 'unknown'}</span>
              <span class="sentiment sentiment-\${item.sentiment || 'neutral'}">\${item.sentiment || 'unknown'}</span>
            </div>
            <div class="email-meta">\${new Date(item.timestamp).toLocaleString()}</div>
          </div>
          
          <div class="email-body">\${escapeHtml(item.preview)}...</div>
          
          <div class="ai-response">
            <h4>🤖 AI Response (editable)</h4>
            <textarea id="response-\${item.id}">\${escapeHtml(item.aiResponse)}</textarea>
          </div>
          
          <div class="actions">
            <button class="btn btn-approve" onclick="approve('\${item.id}')">✓ Approve & Send</button>
            <button class="btn btn-reject" onclick="reject('\${item.id}')">✕ Reject</button>
          </div>
        </div>
      \`).join('');
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function approve(id) {
      const response = document.getElementById('response-' + id).value;
      
      const res = await fetch('/api/review/' + id + '/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifiedResponse: response })
      });
      
      if (res.ok) {
        document.getElementById('card-' + id).style.opacity = '0.5';
        document.getElementById('card-' + id).innerHTML = '<p style="padding: 20px; color: #4CAF50;">✓ Sent!</p>';
        setTimeout(loadQueue, 1500);
      }
    }
    
    async function reject(id) {
      const res = await fetch('/api/review/' + id + '/reject', {
        method: 'POST'
      });
      
      if (res.ok) {
        document.getElementById('card-' + id).remove();
        loadQueue();
      }
    }
    
    // Load on start
    loadQueue();
    
    // Auto-refresh every 30 seconds
    setInterval(loadQueue, 30000);
  </script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Home redirect
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎀 Mythic AI Support running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook/inbound`);
  console.log('\n--- Ready to receive emails! ---\n');
});
