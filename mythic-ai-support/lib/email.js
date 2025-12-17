// Postmark Email Integration
const postmark = require('postmark');

let client = null;

function initEmail() {
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    throw new Error('POSTMARK_SERVER_TOKEN is required');
  }
  
  client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
  console.log('✅ Postmark email connected');
  return client;
}

// Parse incoming webhook from Postmark
function parseInboundEmail(webhookData) {
  return {
    from: webhookData.From || webhookData.FromFull?.Email,
    fromName: webhookData.FromName || webhookData.FromFull?.Name,
    to: webhookData.To || webhookData.ToFull?.[0]?.Email,
    subject: webhookData.Subject || '(No Subject)',
    body: webhookData.TextBody || stripHtml(webhookData.HtmlBody) || '',
    htmlBody: webhookData.HtmlBody,
    messageId: webhookData.MessageID,
    date: webhookData.Date,
    attachments: webhookData.Attachments || [],
    headers: webhookData.Headers || []
  };
}

// Strip HTML tags for plain text
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Send email response
async function sendEmail({ to, subject, body, replyToMessageId = null }) {
  if (!client) {
    throw new Error('Email client not initialized');
  }
  
  const emailData = {
    From: process.env.FROM_EMAIL || 'info@mythicappareltees.com',
    To: to,
    Subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    TextBody: body,
    HtmlBody: formatHtmlEmail(body),
    MessageStream: 'outbound'
  };
  
  // Add reply headers if this is a response to an existing thread
  if (replyToMessageId) {
    emailData.Headers = [
      { Name: 'In-Reply-To', Value: replyToMessageId },
      { Name: 'References', Value: replyToMessageId }
    ];
  }
  
  try {
    const result = await client.sendEmail(emailData);
    console.log(`📧 Email sent to ${to} - MessageID: ${result.MessageID}`);
    return result;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// Format plain text as simple HTML
function formatHtmlEmail(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const withBreaks = escaped.replace(/\n/g, '<br>');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${withBreaks}
</body>
</html>`;
}

// Queue email for human review (stores in memory for now, could be database)
const reviewQueue = [];

function queueForReview(emailData, aiResponse, analysis) {
  const queueItem = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    email: emailData,
    aiResponse: aiResponse,
    analysis: analysis,
    status: 'pending'
  };
  
  reviewQueue.push(queueItem);
  console.log(`📋 Email queued for review: ${queueItem.id}`);
  return queueItem;
}

function getReviewQueue() {
  return reviewQueue.filter(item => item.status === 'pending');
}

function approveAndSend(queueId, modifiedResponse = null) {
  const item = reviewQueue.find(i => i.id === queueId);
  if (!item) return null;
  
  item.status = 'approved';
  const responseToSend = modifiedResponse || item.aiResponse.response;
  
  return sendEmail({
    to: item.email.from,
    subject: item.email.subject,
    body: responseToSend,
    replyToMessageId: item.email.messageId
  });
}

function rejectFromQueue(queueId) {
  const item = reviewQueue.find(i => i.id === queueId);
  if (item) {
    item.status = 'rejected';
  }
  return item;
}

module.exports = {
  initEmail,
  parseInboundEmail,
  sendEmail,
  queueForReview,
  getReviewQueue,
  approveAndSend,
  rejectFromQueue
};
