# SCP Demo Server

**A reference implementation of the server-side component for the [Shopper Context Protocol (SCP)](rfc/).**

## What is This?

This is a **sample SCP server** that demonstrates how merchants can implement the Shopper Context Protocol to share customer data with AI assistants. It's the server-side component that:

- 🔐 **Authenticates customers** via OAuth 2.0 with magic links
- 📊 **Provides customer data** (orders, loyalty, preferences, intents) to AI assistants
- 🌐 **Runs on the edge** using Cloudflare Workers for low latency
- 🎭 **Includes mock data** so you can test without connecting real systems

### The Complete SCP Ecosystem

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   AI Assistant  │ ◄─────► │   SCP Server     │ ◄─────► │  Your Customer  │
│   (Claude, etc) │  JSON-  │  (This Project)  │  OAuth  │  Data & Systems │
│                 │   RPC   │                  │  Magic  │                 │
└─────────────────┘         └──────────────────┘  Links  └─────────────────┘
```

**This repository** implements the SCP Server component. The full protocol specification is available in the [`rfc/`](rfc/) folder.

## Features

- ✅ **OAuth 2.0 with Magic Links** - Passwordless authentication flow
- ✅ **Complete SCP Implementation** - All core SCP methods (orders, loyalty, intents, preferences)
- ✅ **Universal Email Support** - Works with ANY email address, generates mock data on-the-fly
- ✅ **Edge Deployment** - Runs on Cloudflare Workers for global low latency
- ✅ **Production Ready** - Includes D1 database and KV storage for OAuth state
- ✅ **Easy Testing** - Console logging mode for development without email setup

## Architecture

```
Cloudflare Worker (This Server)
├── OAuth Server (magic links via email or console)
├── SCP JSON-RPC API (implements protocol spec)
├── Mock Customer Database (deterministic generation)
└── D1/KV Storage (OAuth state only)
```

## Quick Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works fine)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd scp-server-example

# Run the automated setup script
./setup.sh
```

The setup script will:
1. ✅ Copy configuration templates (`.dev.vars`, `wrangler.toml`)
2. ✅ Install dependencies (`npm install`)
3. ✅ Log you into Cloudflare (if needed)
4. ✅ Create D1 database for OAuth state
5. ✅ Create KV namespaces for auth tokens
6. ✅ Run database migrations
7. ✅ Configure environment variables

**The script is interactive** - it will pause before migrations and ask for confirmation before creating new resources if they already exist.

### 2. Choose Your Magic Link Mode

After setup, edit `.dev.vars` to configure how magic links are sent:

#### Option A: Console Logging (Default - No Email Setup Required)

Perfect for local development and testing:

```bash
# .dev.vars
JWT_SECRET=local-test-secret-change-in-production-12345
PUBLIC_URL=http://localhost:8787
# RESEND_API_KEY=  # Leave commented out
EMAIL_FROM=auth@yourdomain.com
```

**How it works:** Magic links are logged to the console. When testing, copy the link from terminal output.

#### Option B: Real Email Sending (For Production-Like Testing)

Send actual magic link emails using [Resend](https://resend.com):

```bash
# .dev.vars
JWT_SECRET=local-test-secret-change-in-production-12345
PUBLIC_URL=http://localhost:8787
RESEND_API_KEY=re_YourActualResendKey  # Get free key at resend.com
EMAIL_FROM=auth@yourdomain.com  # Your verified sending domain
```

**How it works:** Real emails are sent via Resend API. User clicks link in their inbox.

### 3. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:8787`

### 4. Test It

```bash
# Test the OAuth flow (uses console or email based on your config)
cd test-utils
./test-oauth-flow.sh

# Or specify a custom email
TEST_EMAIL="your.email@example.com" ./test-oauth-flow.sh
```

If using **console mode**, you'll see output like:
```
[AUTHORIZE] Magic link: http://localhost:8787/v1/authorize/confirm?token=abc123...
```
Copy and visit that URL to complete authentication.

If using **email mode**, check your inbox for the magic link email.

## Configuration Options

### Magic Link Delivery Methods

The server supports two modes for delivering magic links:

| Mode | Use Case | Configuration | User Experience |
|------|----------|---------------|-----------------|
| **Console Logging** | Local development, testing | Don't set `RESEND_API_KEY` | Links logged to terminal |
| **Email Sending** | Production, realistic testing | Set `RESEND_API_KEY` | Links emailed via Resend |

**Switching modes:** Simply comment/uncomment `RESEND_API_KEY` in `.dev.vars` and restart the server.

### Environment Variables Reference

Edit `.dev.vars` for local development:

```bash
# Required
JWT_SECRET=your-secret-here              # Secret for signing tokens (change in production!)
PUBLIC_URL=http://localhost:8787         # Where your server is accessible

# Optional - Email Sending
RESEND_API_KEY=re_your_key_here          # Get from https://resend.com (optional)
EMAIL_FROM=auth@yourdomain.com           # Verified sender email (optional)
```

**Notes:**
- If `RESEND_API_KEY` is **not set**: Magic links are logged to console
- If `RESEND_API_KEY` **is set**: Magic links are sent via email
- `JWT_SECRET` should be a long random string in production

## Manual Setup

If you prefer manual setup instead of using `setup.sh`:

<details>
<summary>Click to expand manual setup steps</summary>

### 1. Copy Configuration Templates

```bash
cp .dev.vars.example .dev.vars
cp wrangler.toml.example wrangler.toml
```

Edit `.dev.vars` with your values (use defaults for testing).

### 2. Install Dependencies

```bash
npm install
```

### 3. Login to Cloudflare

```bash
npx wrangler login
```

### 4. Create D1 Database

```bash
npx wrangler d1 create scp-oauth-local
```

Copy the `database_id` from the output and update it in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "scp-oauth-local"
database_id = "YOUR_DB_ID_HERE"  # Paste the ID here
```

### 5. Create KV Namespaces

```bash
npx wrangler kv:namespace create AUTH_REQUESTS
npx wrangler kv:namespace create MAGIC_LINK_TOKENS
```

Copy the IDs and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "AUTH_REQUESTS"
id = "YOUR_KV_ID_HERE"

[[kv_namespaces]]
binding = "MAGIC_LINK_TOKENS"
id = "YOUR_KV_ID_HERE"
```

### 6. Run Migrations

```bash
npm run d1:migrate
```

### 7. Start Development Server

```bash
npm run dev
```

</details>

## Development Workflow

### Starting the Server

```bash
npm run dev
```

The server runs on `http://localhost:8787` with hot reload enabled.

### Testing with Different Email Modes

**Console Mode (Default):**
```bash
# Start server
npm run dev

# In another terminal, run tests
cd test-utils
./test-oauth-flow.sh

# Look for magic link in server logs:
# [AUTHORIZE] Magic link: http://localhost:8787/v1/authorize/confirm?token=...
# Copy and visit the URL
```

**Email Mode:**
```bash
# 1. Add RESEND_API_KEY to .dev.vars
# 2. Restart server
npm run dev

# 3. Run tests with your real email
TEST_EMAIL="your.email@example.com" ./test-oauth-flow.sh

# 4. Check your inbox and click the link
```

### Viewing Logs

```bash
# Local development logs (console output)
npm run dev

# Production logs (after deployment)
npm run tail
```

### Troubleshooting

#### `D1_ERROR: no such table: auth_codes`

The database migrations haven't been applied:

```bash
npx wrangler d1 migrations apply scp-oauth-local --local
```

#### Magic links not appearing

**Console mode:** Check terminal output for `[AUTHORIZE] Magic link: ...`

**Email mode:** 
- Verify `RESEND_API_KEY` is set in `.dev.vars`
- Check Resend dashboard for delivery status
- Verify `EMAIL_FROM` domain is verified in Resend
- Check spam folder

#### `wrangler: command not found`

Always use `npx wrangler` instead of `wrangler`:
```bash
npx wrangler --version
```

## Deployment to Production

### 1. Create Production Resources

Create separate production resources in Cloudflare:

```bash
# Create production database
npx wrangler d1 create scp-oauth-production --env production

# Create production KV namespaces
npx wrangler kv:namespace create AUTH_REQUESTS --env production
npx wrangler kv:namespace create MAGIC_LINK_TOKENS --env production
```

Update the `[env.production]` section in `wrangler.toml` with the IDs.

### 2. Run Production Migrations

```bash
npm run d1:migrate:prod
```

### 3. Set Production Secrets

**Required:**
```bash
npx wrangler secret put JWT_SECRET --env production
# Enter a strong random string (use: openssl rand -base64 32)
```

**Optional (for email sending):**
```bash
npx wrangler secret put RESEND_API_KEY --env production
# Enter your production Resend API key
```

### 4. Deploy

```bash
npm run deploy:production
```

Your server will be live at the URL shown in the deployment output.

### 5. Verify Production Setup

```bash
# Test the capabilities endpoint
curl https://your-domain.workers.dev/v1/capabilities

# Check logs
npm run tail
```

### Production Checklist

Before going live:

- ✅ Generate strong `JWT_SECRET` (min 32 characters)
- ✅ Set production `PUBLIC_URL` in `wrangler.toml`
- ✅ Configure custom domain (optional)
- ✅ Set up email sending with `RESEND_API_KEY`
- ✅ Verify DKIM/SPF for email domain
- ✅ Test with real email addresses
- ✅ Monitor logs and errors
- ✅ Set up alerts for failures
- ✅ Review CORS settings for your frontend

## API Endpoints

### OAuth Endpoints

- `POST /v1/authorize/init` - Initiate magic link authorization
- `GET /v1/authorize/poll` - Poll for authorization status
- `GET /v1/authorize/confirm` - Magic link landing page
- `POST /v1/token` - Exchange code for tokens or refresh
- `POST /v1/revoke` - Revoke token

### SCP Data Endpoints

- `GET /v1/capabilities` - Get server capabilities
- `POST /v1/rpc` - JSON-RPC endpoint for all SCP methods

### Supported SCP Methods

#### Order History
- `scp.get_orders` - Fetch order history with pagination

#### Loyalty Program
- `scp.get_loyalty` - Fetch loyalty status, points, and tier info

#### Offers & Promotions
- `scp.get_offers` - Fetch active offers and discounts

#### Customer Preferences
- `scp.get_preferences` - Fetch sizes, brands, addresses, and communication preferences

#### Intent Management
- `scp.create_intent` - Create a new shopping intent
- `scp.get_intents` - Query existing intents
- `scp.update_intent` - Update intent milestones
- `scp.fulfill_intent` - Mark intent as fulfilled

## Mock Customer Data

The demo server **accepts ANY email address** and automatically generates a realistic customer profile for it. This makes it perfect for testing with real email addresses when sending magic links.

### How It Works

- 🎲 **Deterministic Generation** - Same email always generates the same customer profile
- 👤 **Realistic Profiles** - Random names, loyalty tiers, preferences, and addresses
- 📊 **Weighted Distribution** - 40% Bronze, 30% Silver, 20% Gold, 10% Platinum
- 🔄 **No Database Required** - All data generated on-the-fly

### Example Profiles

Try these emails to see different customer types:

- `demo@example.com` - Gold tier customer
- `test@example.com` - Silver tier customer  
- `your.email@domain.com` - Any email works!

### Customer Profile Includes

Each generated customer has:
- ✅ Loyalty tier and points
- ✅ Shopping preferences (sizes, brands, styles)
- ✅ Saved addresses
- ✅ Communication preferences
- ✅ Order history (via mock orders)

### Customizing Generation

To modify how customer profiles are generated, edit `src/mock-data/customer.ts`:

```typescript
// Adjust loyalty tier distribution
if (tierRoll < 0.4) loyaltyTier = LOYALTY_TIERS[0]; // 40% Bronze
else if (tierRoll < 0.7) loyaltyTier = LOYALTY_TIERS[1]; // 30% Silver
// ... etc
```

## Customizing for Your Business

### 1. Replace Mock Data with Your Database

Update `src/mock-data/customer.ts` to connect to your actual customer database:

```typescript
export async function getCustomerByEmail(email: string): Promise<MockCustomer | null> {
  // Replace with your database query
  const result = await yourDatabase.query('SELECT * FROM customers WHERE email = ?', [email]);
  return result.rows[0];
}
```

### 2. Customize Order Data

Update `src/mock-data/orders.ts` to use your order management system:

```typescript
export async function getOrdersForCustomer(customerId: string) {
  // Connect to your order database
  return await yourOrderSystem.getOrders(customerId);
}
```

### 3. Update Loyalty Program Logic

Modify `src/rpc/handler.ts` to reflect your loyalty program rules:

```typescript
async function getLoyalty(customerId: string) {
  // Connect to your loyalty platform
  const loyalty = await yourLoyaltySystem.getStatus(customerId);
  return { loyalty };
}
```

## Testing the Server

### Test OAuth Flow

```bash
cd test-utils
./test-oauth-flow.sh
```

### Test SCP Methods

```bash
# Get a test token first
TOKEN="your_access_token_here"

# Test get_orders
curl -X POST http://localhost:8787/v1/rpc \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "scp.get_orders",
    "params": {"limit": 10}
  }'
```

## Security Considerations

### Production Checklist

- ✅ Change `JWT_SECRET` to a strong random value
- ✅ Use HTTPS in production (automatically handled by Cloudflare)
- ✅ Configure CORS properly for your frontend domain
- ✅ Set up proper email sender domain with DKIM/SPF
- ✅ Enable rate limiting in `wrangler.toml`
- ✅ Review and update token expiration times
- ✅ Implement proper logging and monitoring
- ✅ Add request validation and sanitization

## Database Schema

The server uses Cloudflare D1 for OAuth state management. See `migrations/001_oauth_only.sql` for the schema.

### Tables

- `auth_codes` - Authorization codes for OAuth flow
- `refresh_tokens` - Refresh tokens for token renewal

## Project Structure

### Configuration Files

The project uses template files for configuration:

| File | Purpose | Committed to Git? |
|------|---------|------------------|
| `.dev.vars.example` | Template for local environment variables | ✅ Yes |
| `.dev.vars` | Your actual local secrets (auto-generated) | ❌ No |
| `wrangler.toml.example` | Template for Cloudflare configuration | ✅ Yes |
| `wrangler.toml` | Your actual config with IDs (auto-generated) | ❌ No |

The `.example` files are templates that get copied to create your local configuration. Your actual `wrangler.toml` and `.dev.vars` files contain secrets and IDs specific to your Cloudflare account and are **not committed to git**.

## Contributing

This is a demo/example server. Feel free to fork and customize for your needs.

## License

Apache-2.0

## Understanding the Protocol

This server implements the **Shopper Context Protocol (SCP)** specification. The complete protocol documentation is in the [`rfc/`](rfc/) folder:

- **[`scp_rfc.md`](rfc/scp_rfc.md)** - Complete SCP specification (80KB, 2393 lines)
  - Protocol overview and architecture
  - OAuth flow details
  - Data schemas for orders, loyalty, preferences
  - JSON-RPC API specification
  
- **[`scp_intent_spec_addendum.md`](rfc/scp_intent_spec_addendum.md)** - Intent specification (41KB, 1474 lines)
  - Shopping intent lifecycle
  - Intent creation and tracking
  - Fulfillment workflows

**Quick Start:** If you're new to SCP, start with the main RFC to understand how AI assistants connect to merchant systems.

## Resources

### SCP Protocol
- 📖 [SCP Specification (in this repo)](rfc/scp_rfc.md)
- 🎯 [Intent Specification (in this repo)](rfc/scp_intent_spec_addendum.md)
- 🌐 [SCP Website](https://shoppercontextprotocol.com) (if available)

### Technologies Used
- ⚡ [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Edge compute platform
- 🗄️ [Cloudflare D1](https://developers.cloudflare.com/d1/) - Serverless SQL database
- 🔑 [Cloudflare KV](https://developers.cloudflare.com/kv/) - Key-value storage
- 🚀 [Hono Framework](https://hono.dev/) - Fast web framework
- 📧 [Resend](https://resend.com) - Email API (optional)

### Getting Help
- 💬 For **protocol questions**: Read the RFCs in [`rfc/`](rfc/)
- 🐛 For **server issues**: File an issue on this repository
- 📚 For **Cloudflare help**: See [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
