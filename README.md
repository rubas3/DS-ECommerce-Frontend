# Ecommerce Frontend (Event-Driven Version with Kafka)

This project is a Next.js ecommerce app using Firebase auth + MongoDB, now upgraded with a Kafka-based order workflow.

## What is implemented

- Checkout creates an order with `PENDING_PAYMENT`.
- Order API publishes `order.created` event to Kafka.
- Kafka consumer processes payment and inventory update.
- Order status transitions to `CONFIRMED` after inventory deduction.
- Backend events are stored in MongoDB (`system_events`) for demo/debug visibility.

## Event flow

1. User clicks `Confirm Payment & Place Order`.
2. `POST /api/orders/confirm`:
   - creates order in MongoDB (`PENDING_PAYMENT`)
   - publishes `order.created`
3. Worker (`workers/order-payment-consumer.mjs`) consumes `order.created`:
   - deducts stock from `products.stock`
   - marks payment done (`PAYMENT_COMPLETED`) only after inventory succeeds
   - marks order `CONFIRMED`
   - clears user cart
4. Worker publishes:
   - `payment.completed`
   - `inventory.deducted` (or `inventory.failed`)
   - `order.confirmed`

## Full Docker Containerization

The entire backend infrastructure, including the Next.js web application, Kafka (Redpanda), and the background worker, are fully containerized using Docker.

`docker-compose.yml` contains:
- `web` (Next.js frontend and API routes)
- `worker` (Background process for order/payment/inventory consumer)
- `redpanda` (Kafka-compatible broker)
- `redpanda-console` (UI for topics/messages)

### Start Everything (Recommended)

1. Create `.env.local` from `.env.example` and fill in your MongoDB and Firebase values.
2. Start the entire application stack:
```bash
docker compose up -d --build
```

The web application will be available at [http://localhost:3000](http://localhost:3000)
The Kafka Console will be available at [http://localhost:8080](http://localhost:8080)

### Connect Vercel Frontend to Local Docker Backend (Ngrok)

If you are using the Vercel-deployed frontend and want it to communicate with your local Docker containers:
1. Start your Docker backend: `docker compose up -d`
2. Open a terminal and start an ngrok tunnel to port 3000:
   ```bash
   ngrok http 3000
   ```
3. Copy the secure `https://...` URL provided by ngrok.
4. Update your Vercel project's Environment Variables setting `NEXT_PUBLIC_API_BASE_URL` to the new ngrok URL and redeploy/refresh.

### Manual Local Setup (Alternative)

If you prefer to run the Next.js app natively on your machine without Docker:
1. Start only Kafka:
   ```bash
   docker compose up -d redpanda redpanda-console
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Next.js app:
   ```bash
   npm run dev
   ```
4. Start Kafka consumer worker (new terminal):
   ```bash
   npm run kafka:consumer
   ```

## Environment variables

Minimum Kafka/Mongo variables:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ecommerce
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:19092
KAFKA_CLIENT_ID=ecommerce-frontend
DEFAULT_PRODUCT_STOCK=100
```

Firebase variables from your existing setup are still required for authentication.
`DEFAULT_PRODUCT_STOCK` is used as a safe fallback for legacy product documents where `stock` does not exist yet.

## How to show backend processing in demo

### 1) Order status API

`GET /api/orders/status?orderId=<id>`

- returns `status`, `paymentStatus`, `inventoryStatus`
- checkout page polls this API and shows live state

### 2) Event log API

`GET /api/debug/events?orderId=<id>`

- returns recent Kafka-related lifecycle events for authenticated user
- source collection: `system_events`

### 3) Kafka topic visibility

Use Redpanda Console (`localhost:8080`) to show:
- topic list
- produced messages
- offsets/consumers

## Useful scripts

- `npm run dev` - start Next.js
- `npm run kafka:consumer` - start order/payment/inventory consumer worker
- `npm run lint` - run ESLint

## Notes for university presentation

- This is an event-driven architecture with asynchronous consistency.
- Order confirmation is no longer immediate DB-only action.
- Payment and inventory are processed by a Kafka consumer.
- Event logs provide an explainable audit trail for each order lifecycle.
