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
npm run dev
```

### 2. Client setup

```bash
cd client
npm install
npm start
```

## Features

- **Players:** Browse grounds, book slots, pay online or at venue, advance payment via gateway, cancel bookings, leave reviews
- **Owners:** Add/delete grounds, manage ground images, configure advance payment, manage slots (block/price), view bookings & analytics
- **Admin:** Approve owners & grounds, manage users, view all bookings
- **Payments:** Full booking payment via Sslcommerz, advance payment via sslcommerz, webhooks for auto-confirmation
- **Real-time:** Socket.IO notifications for booking events
