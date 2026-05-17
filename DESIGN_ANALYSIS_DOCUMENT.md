# Distributed E-Commerce System - Design and Analysis Document

## 1. Problem Statement

Traditional ecommerce systems often handle checkout in a single synchronous flow: create order, process payment, update inventory, and respond immediately. This becomes risky and hard to scale when traffic increases, because:

- long request chains increase failure probability and latency
- one slow/failing component (inventory/payment) can block the full checkout path
- state transitions are harder to trace and recover

To address this, a distributed event-driven approach is used where services communicate over a message broker and process work asynchronously with clear lifecycle states.

## 2. Architectural Style

### Chosen Architecture: Event-Driven Microservice-Oriented Design

The solution is organized into independent components connected through Kafka-compatible messaging (Redpanda):

- User/Auth Service (Firebase auth + sync API)
- Product Service (`/api/products`, MongoDB `products`)
- Order Service (`/api/orders/confirm`, `/api/orders/status`, MongoDB `orders`)
- Payment Simulation + Inventory Processing Worker (Kafka consumer)
- Event Broker (Redpanda) + Observability UI (Redpanda Console)

Why this style was chosen:

- natural fit for order lifecycle events (`order.created` -> `inventory.deducted` -> `payment.completed` -> `order.confirmed`)
- better fault isolation and decoupling between API and background processing
- clearer observability using event streams and audit collections

### Alternatives Considered and Rejected

1. **Monolithic synchronous checkout**
   - rejected due to tight coupling and poor fault tolerance
2. **Direct service-to-service HTTP orchestration only**
   - rejected because retries, ordering, and auditability become harder than brokered event flow
3. **Single database transaction for all steps**
   - rejected as impractical for distributed boundaries and asynchronous services

## 3. System Architecture Diagram

```mermaid
flowchart LR
  U[Client UI] --> O[Order API Service]
  O --> MDB[(MongoDB: orders, carts)]
  O --> K[(Redpanda / Kafka)]

  K --> W[Inventory + Payment Worker]
  W --> PDB[(MongoDB: products)]
  W --> ODB[(MongoDB: orders)]
  W --> EDB[(MongoDB: system_events, processed_events)]
  W --> K

  A[Auth Service (Firebase)] --> O
  C[Redpanda Console] --> K
```

## 4. Sustainability and Environmental Analysis

### Positive Impact

- asynchronous processing reduces repeated blocking retries at request time
- decoupled services allow targeted horizontal scaling only where needed (worker/broker), reducing over-provisioning
- containerized deployment improves reproducibility and reduces setup waste across team members

### Trade-offs

- event brokers and consumers introduce always-on infrastructure overhead
- duplicate logs/audit events increase storage footprint

### Mitigation Strategy

- run lightweight local Redpanda profile for development
- keep topic partition count minimal for assignment scope
- retain only required audit events (TTL/archival policy in future)
- monitor consumer lag and tune worker concurrency before scaling replicas

## 5. Mandatory Requirements Mapping

### Must use network communication

Satisfied:
- frontend <-> API over HTTP
- API/worker <-> Redpanda over Kafka protocol (networked broker)
- services <-> MongoDB Atlas over network

### No monolithic single-process system

Satisfied:
- Next.js app/API process
- Kafka consumer worker process
- Redpanda broker + console containers
- external Firebase auth service

### Minimum 3 distributed components

Satisfied with more than 3:
- Order service
- Product service
- Payment/Inventory worker
- Message broker
- Auth service

### Must include sustainability analysis

Satisfied in Section 4.

### All members must contribute

Recommended evidence to attach in final submission:
- git commit history by each member
- assigned module ownership matrix
- short contribution summary table in appendix

## 6. Data and Event Model Notes

- `products` stores inventory in `stock`
- no separate inventory database is used; inventory is logically separated by collection/service responsibility
- `orders` tracks lifecycle status (`PENDING_PAYMENT`, `FAILED_INVENTORY`, `CONFIRMED`, etc.)
- `system_events` stores user-visible event trail
- `processed_events` stores consumed `eventId` values for idempotency (prevents duplicate re-processing)

## 7. Viva Quick Notes (What to Explain Clearly)

1. Why distributed?  
   Checkout steps have different failure modes; event-driven flow isolates failures and improves resilience.

2. Why Redpanda/Kafka?  
   Durable event stream, decoupled producer-consumer model, observable topics and offsets.

3. What is `processed_events`?  
   Idempotency guard: if same event is consumed twice, duplicate processing is skipped safely.

4. What is consumer group used for?  
   `payment-inventory-group` ensures coordinated consumption and scalable workers; lag shows if worker is behind.

5. Why inventory before payment?  
   Prevents charging user when stock is unavailable in this simulation flow.

6. How to prove event-driven execution in demo?  
   Show order placement in UI, then observe topic messages in Redpanda Console and status transitions in MongoDB/API.

## 8. Practical Deployment Decision for This Project

For this implementation, deployment is intentionally split:

- **Frontend**: Vercel (public hosting)
- **Backend APIs & Worker**: Local runtime (Fully containerized using Docker)
- **Event Broker**: Redpanda/Kafka (Fully containerized using Docker)

Reason for this decision:

- Kafka consumer is a long-running process and does not fit Vercel serverless execution model
- keeping broker and consumer local preserves deterministic demo behavior for coursework
- frontend remains easy to access and demonstrate from any browser

### Docker Containerization Strategy

To ensure consistency and ease of deployment across different environments, the entire backend stack has been containerized using Docker:
- **`web` container**: A multi-stage, highly optimized Docker image running the Next.js API routes (and frontend locally).
- **`worker` container**: Uses the exact same Next.js Docker image but overrides the start command to strictly run the Kafka consumer background process.
- **`redpanda` container**: Runs the Kafka-compatible broker.

Operational implication:

- frontend sends API requests to backend base URL through `NEXT_PUBLIC_API_BASE_URL`
- local backend must be reachable from internet (for example via an ngrok tunnel) when using Vercel frontend
- running the backend is as simple as executing `docker compose up -d --build` on the host machine.
