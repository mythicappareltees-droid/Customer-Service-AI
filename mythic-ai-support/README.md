# 🎀 Mythic AI Support

AI-powered customer support for Mythic Transfers. Automatically responds to customer emails using Claude AI, with Shopify order lookups and a review dashboard for sensitive inquiries.

## Features

- **Intelligent Auto-Responses**: Claude AI understands customer intent and responds in your brand voice
- **Shopify Integration**: Automatically looks up order status, tracking, and customer history
- **Smart Routing**: Auto-sends routine responses, queues sensitive ones for review
- **Review Dashboard**: Simple UI to approve, edit, or reject AI responses
- **Scam Detection**: Flags suspicious patterns for human review

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Get Your API Keys

You need 3 things:

#### 1. Anthropic API Key (for Claude AI)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Go to API Keys → Create Key
4. Copy the key (starts with `sk-ant-`)

#### 2. Postmark Account (for email)
1. Go to [postmarkapp.com](https://postmarkapp.com/) → Start Free Trial
2. Create a new Server (name it "Mythic Support")
3. Go to Server → API Tokens → Copy the Server API Token
4. **Important**: Verify your domain (Settings → Sender Signatures)

#### 3. Shopify API Access (for order lookups)
1. Shopify Admin → Settings → Apps and sales channels → Develop apps
2. Create an app called "AI Support"
3. Configure Admin API scopes:
   - `read_orders`
   - `read_customers`
4. Install the app and copy the Admin API access token

---

### Step 2: Deploy to Railway

Railway is the easiest way to host this. Free tier works fine.

1. Go to [railway.app](https://railway.app/) and sign up
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub and select this repo (or use "Deploy from Local")
4. Add your environment variables:

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
POSTMARK_SERVER_TOKEN=xxxxx-xxxxx-xxxxx
FROM_EMAIL=info@mythicappareltees.com
SHOPIFY_SHOP_NAME=your-shop-name
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

5. Railway will auto-deploy. Copy your public URL (like `mythic-support.up.railway.app`)

---

### Step 3: Configure Postmark Inbound

1. In Postmark, go to **Server → Default Inbound Stream → Settings**
2. Set the Inbound Webhook URL to:
   ```
   https://your-railway-url.up.railway.app/webhook/inbound
   ```
3. Set up your inbound email address:
   - Use a Postmark inbound address, OR
   - Forward your support email to Postmark

**Option A: Use Postmark's inbound address**
Your inbound address will be something like `xxxxx@inbound.postmarkapp.com`. Set up email forwarding from `info@mythicappareltees.com` to this address.

**Option B: Custom domain (recommended)**
1. Add an MX record to your domain pointing to Postmark
2. Configure the inbound address in Postmark settings

---

### Step 4: Test It!

1. Visit your dashboard: `https://your-railway-url.up.railway.app/dashboard`
2. Send a test email to your support address
3. Watch it appear in the dashboard (or auto-send if it's a simple question)

---

## 📊 Using the Dashboard

Access at `/dashboard` on your deployed URL.

- **Auto-sent emails** don't appear here (they're handled automatically)
- **Review queue** shows emails that need approval:
  - Refund requests
  - Damage claims
  - Angry customers
  - Anything involving money

For each email you can:
- **Approve & Send**: Sends the AI response (you can edit it first)
- **Reject**: Removes from queue (you'll need to respond manually)

---

## 🎯 What Gets Auto-Sent vs Reviewed

### Auto-Send (no review needed)
- Order status questions
- Press instructions / how-to questions
- File format questions
- Shipping timeframe questions
- General policy questions
- Combine order requests

### Human Review Required
- Damage claims (always)
- Refund requests
- Angry or threatening customers
- Discount code issues
- Anything involving money back
- Potential scam patterns

---

## 🔧 Local Development

```bash
# Clone and install
git clone <your-repo>
cd mythic-ai-support
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run locally
npm run dev

# Test webhook with ngrok
ngrok http 3000
# Use the ngrok URL in Postmark's webhook settings
```

---

## 📁 Project Structure

```
mythic-ai-support/
├── index.js              # Main server & dashboard
├── lib/
│   ├── ai.js             # Claude AI integration
│   ├── email.js          # Postmark integration
│   ├── shopify.js        # Shopify order lookups
│   └── knowledge-base.js # Your policies & brand voice
├── package.json
├── .env.example
└── README.md
```

---

## 🛠 Customization

### Update Your Knowledge Base

Edit `lib/knowledge-base.js` to update:
- Policies
- Press instructions
- Response guidelines
- Brand voice

### Adjust AI Behavior

Edit the system prompt in `lib/ai.js` → `buildSystemPrompt()` to change how Claude responds.

### Change Routing Rules

Edit `CONFIDENCE_RULES` in `lib/knowledge-base.js` to control what gets auto-sent vs reviewed.

---

## 💰 Costs

- **Railway**: Free tier, then ~$5/month
- **Postmark**: 100 emails free, then ~$10/month for 10k emails
- **Anthropic**: ~$0.003 per email (Claude Sonnet) = ~$3 for 1,000 emails
- **Total**: Roughly $15-20/month for moderate volume

---

## 🆘 Troubleshooting

**Emails not arriving?**
- Check Postmark's Activity tab for errors
- Verify webhook URL is correct
- Make sure Railway app is running

**AI responses wrong?**
- Update knowledge base with correct info
- Check the system prompt in ai.js

**Shopify lookups failing?**
- Verify API scopes include read_orders and read_customers
- Check shop name matches exactly (no .myshopify.com)

---

## 📞 Support

Built by Eric for Mythic Transfers. Questions? You know where to find me.
