# Plan: Refactor Task Module with BullMQ and Redis

## Goal
Refactor the `task` module to manage task lifecycle using BullMQ and Redis. The existing stateful `Task` class will be replaced by a stateless `TaskContext` that utilizes Redis for log buffering and real-time events.

## Key Changes
1.  **Lifecycle Management**: Use BullMQ for task queuing and execution.
2.  **State Management**: Remove in-memory `Task` map. Use DB and Redis as the source of truth.
3.  **Logging Strategy**:
    -   **Write**: Log -> Redis List (Buffer) + Redis Pub/Sub (Realtime) + System Logger (File/Console).
    -   **Persist**: Worker periodically flushes Redis List to DB (Batch Insert).
    -   **Read**: DB (History) + Redis List (Recent) + Redis Pub/Sub (Realtime).
4.  **Traceability**: Pass `traceId` through BullMQ Job Data.

## Tasks

### 1. Setup & Infrastructure
- [ ] Install dependencies: `bullmq`, `ioredis`.
- [ ] Create `src/infrastructure/redis.ts`: Export Redis client (for App) and Subscriber (for SSE).
- [ ] Create `src/modules/task/infrastructure/mq.ts`: Setup Queue `task-queue` and Worker.

### 2. Redesign Task Core
- [ ] **Deprecate** existing `Task` class in `infrastructure/log-task/index.ts`.
- [ ] **Create** `TaskContext` class:
    -   Constructor accepts `job` (BullMQ Job) and `taskId`.
    -   `log(level, message, data)`:
        1.  Generate `traceId` (from Job).
        2.  Call system logger: `logger[level](message, { traceId, ... })`.
        3.  Publish to Redis Channel: `task:{id}:events`.
        4.  Push to Redis List: `task:{id}:logs`.
        5.  **Check & Flush**: If List length > 100, pop and write to DB.
    -   `flush()`: Force write remaining logs from Redis List to DB.
- [ ] **Update** `TaskManager`:
    -   Remove in-memory `tasks` map.
    -   `createTask(type, data)`:
        1.  Create DB record (Pending).
        2.  Add Job to BullMQ with `taskId` and `traceId`.
    -   `registerHandler(type, handler)`: Map task types to execution logic.

### 3. Implement Worker
- [ ] Create `src/modules/task/worker.ts`:
    -   Initialize Worker.
    -   Processor function:
        1.  Extract `taskId`, `traceId`, `type` from Job.
        2.  Instantiate `TaskContext`.
        3.  Find handler for `type`.
        4.  Execute handler(ctx).
        5.  On Success: Update DB status -> Completed. Call `ctx.flush()`.
        6.  On Failure: Update DB status -> Failed. Log error. Call `ctx.flush()`.

### 4. Update API & SSE (`src/modules/task/task.route.ts`)
- [ ] **Refactor** `GET /:id/progress`:
    -   **History**: Fetch logs from DB.
    -   **Buffer**: Fetch logs from Redis List `task:{id}:logs`.
    -   **Stream**: Subscribe to Redis Channel `task:{id}:events`.
    -   Merge and send to client via SSE.

### 5. Migrate `doc` Module
- [ ] Update `doc.service.ts`: Adapt to use `TaskContext` instead of `Task`.
- [ ] Update `doc.route.ts`: Use `taskManager.createTask` (async execution is handled by worker).

### 6. Verification
- [ ] Verify logs flow: Worker -> Redis List -> DB.
- [ ] Verify SSE: Client receives DB logs + Redis List logs + Realtime logs.
- [ ] Verify TraceId in system logs.

## Dependencies
- `bullmq`
- `ioredis`
