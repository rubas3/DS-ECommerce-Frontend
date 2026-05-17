# Ecommerce Frontend Technical Report (Kafka Event-Driven Update)

## 1) Project scope

This application is a Next.js ecommerce project with:

- Firebase Authentication (`signup`, `signin`)
- Firestore profile sync
- MongoDB products, carts, and orders
- Kafka-based event-driven order processing

The system now demonstrates distributed system concepts by decoupling order creation from payment/inventory execution.

---

## 2) Core architecture

### Frontend

- `dashboard`: product listing and add-to-cart
- `cart`: quantity update and remove item
- `checkout`: place order request + live order status polling

### API layer (Next.js routes)

- `GET/POST/PATCH/DELETE /api/cart`
- `GET /api/products`
- `POST /api/orders/confirm` (creates pending order + publishes Kafka event)
- `GET /api/orders/status?orderId=...` (status visibility endpoint)
- `GET /api/debug/events?orderId=...` (event audit endpoint)

### Data layer

- `products` collection: product catalog + stock
- `carts` collection: one cart per user
- `orders` collection: event-driven order lifecycle state
- `system_events` collection: event audit trail for demo and debugging
- `processed_events` collection: idempotency support in consumer

### Event processing worker

- Worker file: `workers/order-payment-consumer.mjs`
- Consumes Kafka `order.created`
- Executes payment + inventory flow
- Publishes follow-up events and updates order state

---

## 3) End-to-end flow (event-driven)

1. User clicks **Confirm Payment & Place Order** on checkout page.
2. `POST /api/orders/confirm`:
   - validates user/cart
   - writes order with:
     - `status: PENDING_PAYMENT`
     - `paymentStatus: PENDING`
     - `inventoryStatus: PENDING`
   - publishes Kafka event: `order.created`
   - writes event log to `system_events`
3. Kafka worker consumes `order.created`:
   - deducts stock from `products.stock` first (atomic Mongo update)
   - if inventory succeeds, marks payment complete (`PAYMENT_COMPLETED`) and publishes `payment.completed`
   - if stock fails -> marks `FAILED_INVENTORY`, publishes `inventory.failed`
   - if stock succeeds -> publishes `inventory.deducted`, marks order `CONFIRMED`, publishes `order.confirmed`
   - clears user cart after successful confirmation
4. Checkout page polls `/api/orders/status` to show current state.

---

## 4) Kafka topics used

- `order.created`
- `payment.completed`
- `payment.failed` (reserved for future payment failure branch)
- `inventory.deducted`
- `inventory.failed`
- `order.confirmed`

Each message includes IDs such as `eventId` and `orderId` for traceability and idempotency.

---

## 4.1) MongoDB collections: what is stored and why

- `products`  
  Stores product catalog and inventory field `stock`.  
  Why: inventory validation and deduction during checkout workflow.

- `carts`  
  Stores per-user cart items before order confirmation.  
  Why: checkout source of truth for items and quantities.

- `orders`  
  Stores order lifecycle state, including:
  - `status` (e.g., `PENDING_PAYMENT`, `FAILED_INVENTORY`, `CONFIRMED`)
  - `paymentStatus`
  - `inventoryStatus`  
  Why: primary business state for order tracking.

- `system_events`  
  Stores event audit trail documents (`order.created`, `inventory.failed`, `payment.completed`, etc.).  
  Why: observability/debugging and demo evidence of event-driven processing.

- `processed_events`  
  Stores consumed incoming event IDs (currently `order.created`) with unique index on `eventId`.  
  Why: idempotency protection; prevents duplicate re-processing when broker re-delivers a message.

---

## 5) Inventory design answer (important)

Yes, inventory must be handled as a dedicated concern in distributed systems.

Implemented approach:

- Product stock is validated and decremented in worker before payment is marked complete.
- If stock is insufficient, order is not confirmed.
- `inventoryStatus` and `status` fields reflect failure explicitly.
- Legacy products without `stock` are backfilled with a configurable fallback (`DEFAULT_PRODUCT_STOCK`).

Why this matters:

- Prevents overselling
- Keeps payment/order/inventory consistency explicit
- Demonstrates saga-style state transitions

---

## 6) How to show backend processing in presentation

You can show backend behavior in three ways:

1. **Kafka UI (Redpanda Console)**  
   Open `http://localhost:8080` and show topics/messages.

2. **Order status API**  
   Call `GET /api/orders/status?orderId=<id>` to show runtime order state transitions.

3. **Event audit API**  
   Call `GET /api/debug/events?orderId=<id>` to show ordered event history from MongoDB.

This gives both message-broker-level and database-level observability for your viva/demo.

---

## 6.1) Worker and consume/publish behavior (important viva clarification)

- A worker is a long-running background process that stays active and continuously listens for events.
- In this project, worker subscribes to (consumes) topic `order.created`.
- "Consumes" means it reads incoming messages from a topic.
- After reading one message, worker does business logic (inventory check/deduction, payment progression, order state updates), then keeps listening for the next message.
- Worker also publishes follow-up events (`inventory.deducted`, `inventory.failed`, `payment.completed`, `order.confirmed`), but does not subscribe to those topics in current implementation.
- Therefore, `processed_events` currently contains consumed `order.created` events only, which is expected.

---

## 7) Docker + run strategy

The entire backend ecosystem is fully containerized and defined in `docker-compose.yml`:

- `web`: Next.js web application and API routes
- `worker`: Background process consuming Kafka events
- `redpanda`: Kafka-compatible broker
- `redpanda-console`: Web UI for monitoring Kafka

Run sequence for full local environment:

1. `docker compose up -d --build`

This single command spins up the API, the worker, and the broker. Required environment values for the containers must be present in `.env.local` (see `.env.example`).

---

## 7.1) Deployment mode used for demo submission

For this project, the preferred submission/deployment split is:

- Frontend deployed on Vercel
- Backend APIs and Kafka consumer kept on local machine
- Redpanda/Kafka broker kept local

Rationale:

- Vercel serverless functions are not suitable for persistent Kafka consumers
- local Kafka is required for the assignment demonstration setup
- frontend remains publicly accessible while backend/event processing stays controllable in local environment

Frontend runtime and tunnel setup:

- To bridge the gap between Vercel and the local Docker environment, an `ngrok` tunnel is used (`ngrok http 3000`).
- The Vercel frontend uses the `NEXT_PUBLIC_API_BASE_URL` environment variable pointing to the ngrok URL to call backend endpoints.
- if this env var is empty, frontend falls back to same-origin `/api/*`
- if set, frontend calls `${NEXT_PUBLIC_API_BASE_URL}/api/*`

---

## 8) Current distributed-system maturity

With Kafka integration, the project now demonstrates:

- asynchronous processing
- service decoupling via topics
- stateful workflow transitions
- basic idempotency handling (`processed_events`)
- event auditability (`system_events`)

Updated maturity view:

- **Architecture foundation:** 7.5/10
- **Production readiness:** 6/10
- **Distributed-system sophistication:** 7/10

Main remaining gaps for production:

- Outbox pattern for guaranteed publish on DB commit
- Dead-letter queue + retry strategy
- Payment gateway webhook integration
- Automated integration/e2e tests
- Monitoring/alerting (latency, consumer lag, failures)

---

## 9) Final conclusion

The project now moves from a request-response order flow to a true event-driven flow using Kafka. It is significantly better aligned with distributed system coursework expectations because order, payment, and inventory are decoupled, traceable, and demonstrably asynchronous.
