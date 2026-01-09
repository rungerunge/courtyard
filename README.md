# Courtyard MVP

A custodial vault + pack opening platform similar to Courtyard.io. Users can purchase mystery packs that reveal pre-owned items from the platform's vault.

## Features

### Customer Features
- 🎁 **Pack Store** - Browse and purchase mystery packs
- 🎰 **Opening Experience** - Animated reveal of assigned items
- 🏦 **Vault System** - Store won items in your personal vault
- 📦 **Shipping** - Request physical delivery of items
- 🏷️ **Marketplace** - List items for resale (simplified)

### Admin Features
- 📊 **Dashboard** - Overview of platform metrics and health
- 📦 **Inventory Management** - Create and manage items
- 🎁 **Pack Management** - Configure packs with tiers and guarantees
- 🔒 **Pack Health Monitor** - Ensure "math always works"
- 📋 **Audit Logging** - Track all admin actions

### Technical Features
- ✅ **Inventory-Backed Packs** - Every outcome is deliverable
- 🔐 **Atomic Assignment** - No double-selling with Redis locks
- 📉 **Auto Out-of-Stock** - Packs disable when inventory insufficient
- 💳 **Stripe Integration** - Secure payment processing

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Locks**: Redis (ioredis)
- **Auth**: NextAuth.js
- **Payments**: Stripe
- **Testing**: Vitest

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis
- Stripe account (test mode)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/courtyard.git
cd courtyard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, Redis URL, Stripe keys, etc.

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Architecture

### Pack Health System

The core of this platform is the **PackHealthCalculator** that ensures the "math always works":

1. **Hard Guarantees** - If a pack guarantees a tier, we verify enough inventory exists for all remaining packs
2. **Soft Weights** - Tier probability weights are used for selection but don't block sales
3. **Auto-Disable** - Packs automatically go OUT_OF_STOCK when constraints can't be met

```
PackHealth = {
  status: "SELLABLE" | "LOW_STOCK" | "OUT_OF_STOCK",
  canSellOne: boolean,
  tierHealth: [
    { tierId, available, required, healthy }
  ],
  warnings: string[]
}
```

### Assignment Flow

```
1. User clicks "Open Pack"
2. Create Stripe Checkout Session
3. User pays
4. Stripe webhook fires
5. Acquire Redis lock for pack
6. Verify PackHealth.canSellOne
7. Select item via weighted random
8. Atomic DB transaction:
   - Update item status to ASSIGNED
   - Create Assignment record
   - Create VaultHolding record
   - Increment pack soldCount
9. Release lock
10. Recalculate health, update pack status if needed
11. User sees reveal animation
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Demo Credentials

**Customer:**
- Email: test@example.com
- Password: test123

**Admin:**
- Email: admin@courtyard.io
- Password: admin123

## Deployment

### Railway

This project is configured for easy deployment on Railway:

1. Create a new Railway project
2. Add PostgreSQL and Redis services
3. Connect your GitHub repo
4. Set environment variables
5. Deploy!

### Manual Docker

```bash
docker-compose up -d
npm run db:push
npm run db:seed
```

## Project Structure

```
courtyard/
├── prisma/
│   ├── schema.prisma      # Data model
│   └── seed.ts            # Sample data
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Login/Register
│   │   ├── (customer)/    # Pack store, vault
│   │   ├── admin/         # Admin dashboard
│   │   └── api/           # API routes
│   ├── components/        # React components
│   ├── lib/               # Core services
│   │   ├── pack-health.ts # Health calculator
│   │   ├── assignment-engine.ts
│   │   ├── prisma.ts
│   │   └── redis.ts
│   └── types/             # TypeScript types
├── vitest.config.ts       # Test config
└── package.json
```

## License

Private - All rights reserved

## Support

For issues or questions, please open a GitHub issue.
