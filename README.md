# PlayPoint v2

A full-stack sports ground booking platform built with React, Node.js, MongoDB, and Stripe.

## Tech Stack

**Backend:** Node.js · Express · MongoDB (Mongoose) · Socket.IO · JWT (access + refresh tokens) · Winston · Joi · Stripe  
**Frontend:** React 18 · Zustand · React Router v6 · Axios · Socket.IO Client

---

## Quick Start

### 1. Server setup

```bash
cd server
npm install
cp .env.example .env
# Fill in your .env values (see below)
npm run dev
```

### 2. Client setup

```bash
cd client
npm install
npm start
```

---

## Environment Variables (`server/.env`)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/playpoint

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=7d

# Client URL (for CORS and Stripe redirects)
CLIENT_URL=http://localhost:3000

# Stripe Payment Gateway
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
# Get from https://dashboard.stripe.com/webhooks (or Stripe CLI for local dev)
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Stripe Setup

1. Create a free account at [https://stripe.com](https://stripe.com)
2. Get your **test** Secret Key from [Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
3. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:5000/api/payment/webhook
   ```
   This gives you a `whsec_...` webhook secret to use in `.env`.
4. Test cards: `4242 4242 4242 4242` · any future expiry · any CVC

---

## Features

- **Players:** Browse grounds, book slots, pay online or at venue, advance payment via gateway, cancel bookings, leave reviews
- **Owners:** Add/delete grounds, manage ground images, configure advance payment, manage slots (block/price), view bookings & analytics
- **Admin:** Approve owners & grounds, manage users, view all bookings
- **Payments:** Full booking payment via Stripe Checkout, advance payment via Stripe Checkout, webhooks for auto-confirmation
- **Real-time:** Socket.IO notifications for booking events
