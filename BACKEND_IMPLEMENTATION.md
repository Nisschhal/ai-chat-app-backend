# AI Chat App — Backend

A learning-oriented backend setup for a real-time chat application. This README doubles as a study guide: each step explains _what_ to do and _why_ it's done that way. Skip to the [Socket.IO section](#socketio-implementation) if you're only here for the real-time part.

---

## Tech stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Real-time:** Socket.IO
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** JWT in httpOnly cookies, verified with Passport
- **Validation:** Zod
- **Package manager:** pnpm

---

## How to use this guide

Read this document in 3 passes:

1. **First pass (What):** read only headings and code blocks to understand what exists.
2. **Second pass (Why):** read the explanations under each step to understand design choices.
3. **Third pass (How):** run the project and trace one real flow (`create chat` -> `send message` -> socket events).

If you are brand new, don't optimize for speed. Optimize for a strong mental model first.

---

## Project workflow at a glance

### The two pipes in this backend

- **HTTP pipe (Express):** request comes in, server responds once, connection ends.
- **WebSocket pipe (Socket.IO):** connection stays open, server and client can push events anytime.

### Why both are needed

- Use **HTTP** when you want to **change/read durable data** (register, login, create chat, send message).
- Use **WebSocket** when you want to **notify instantly** (online status, new chat appears, new message appears live).

### Core backend flow (easy memory version)

1. **Client calls API** -> service validates and writes to DB.
2. **DB becomes source of truth** -> data is permanent.
3. **Server emits socket event** -> connected users see live updates immediately.

Short rule: **Save first, emit second.**

---

## Project setup

### Step 1 — Initialize the project

```bash
npm init -y
```

Creates `package.json`, which tracks scripts, dependencies, and project metadata.

### Step 2 — Install runtime libraries

```bash
pnpm add bcryptjs cloudinary cors cookie-parser dotenv express helmet jsonwebtoken passport passport-jwt socket.io zod
```

> **Note**
>
> - `pnpm add <package>` adds a new package.
> - `pnpm install` installs everything already listed in `package.json` (use this after cloning).

### Step 3 — Install types and dev tools

```bash
pnpm add @types/bcryptjs @types/cookie-parser @types/cors @types/dotenv @types/express @types/jsonwebtoken @types/node @types/passport @types/passport-jwt
```

```bash
pnpm add -D nodemon ts-node typescript
```

> **Note**
> `dotenv` and `bcryptjs` ship with built-in TypeScript types, so `@types/dotenv` and `@types/bcryptjs` are optional.

### Step 4 — TypeScript config

```bash
npx tsc --init
```

Or create `tsconfig.json` manually:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src", "src/@types/**/*.d.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Step 5 — `nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node ./src/index.ts"
}
```

### Step 6 — Environment and ignored files

In `.env`, add: `NODE_ENV`, database URL, `JWT_SECRET`, `FRONTEND_ORIGIN`, and any other secrets / API keys.
In `.gitignore`, add folders that should not be committed (`node_modules`, `dist`, `.env`, etc.).

---

## Application layers

### Step 7 — Utils and config

| File                     | Purpose                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `utils/get-env.ts`       | Reads values from `.env`                                                                                                                                     |
| `utils/app-error.ts`     | Custom error class. Builds errors from `HTTPSTATUS`, `ErrorCode`, and a message — e.g. `InternalServerException`, `NotFoundException`, `BadRequestException` |
| `config/env.config.ts`   | Calls `get-env.ts` to expose typed env vars                                                                                                                  |
| `config/https.config.ts` | Defines `HTTPSTATUS` constants and their TypeScript types                                                                                                    |

### Step 8 — Middleware

| File                                    | Purpose                                                                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `middleware/asyncHandler.middleware.ts` | Wraps every controller so a thrown error is forwarded to `next(error)` instead of crashing. Centralizes the try/catch.                                             |
| `middleware/errorHandler.middleware.ts` | Catches everything passed to `next(error)`, matches it against the `AppError` class from `utils/app-error.ts`, and returns the right status code (404, 500, etc.). |

### Step 9 — Database (Prisma + Postgres on Neon)

Install Prisma:

```bash
pnpm add prisma @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
```

Full guide: [Prisma docs](https://www.prisma.io/docs/prisma-orm/quickstart/prisma-postgres).

Initialize the Prisma CLI:

```bash
pnpm dlx prisma   # or: npx prisma
```

Scaffold the schema:

```bash
pnpm dlx prisma init --output ../generated/prisma
```

This creates:

- a `prisma/` directory with `schema.prisma` (connection + models)
- a `.env` file in the root
- a `prisma.config.ts` file

> **Note** — the output path is configurable; the generated client doesn't have to live in `prisma/`.

Then:

1. Create a singleton Prisma instance in `lib/prisma.ts`.
2. Add `config/database.config.ts` to connect to the DB on startup.
3. Define models in `prisma/schema.prisma`.
4. Run migrations and regenerate the client:
   ```bash
   npx prisma migrate dev --name model-created-for-user-chat-message
   npx prisma generate
   ```

### Step 10 — Cookie helpers

1. Create types for cookie options and expiry.
2. Implement `setJwtAuthCookie(res, userId)`:
   - Builds a JWT with `userId` as payload and `expiresIn` from env.
   - Sets it on the response with these options:
     - `maxAge` — auto-deletes the cookie from the browser at expiry
     - `secure` — `true` in production so the cookie only travels over HTTPS
     - `sameSite` — controls whether the cookie is sent on cross-site requests
     - `httpOnly` — keeps the cookie out of JavaScript (XSS protection)
3. Implement `clearJwtAuthCookie(res)` to clear it on logout.

### Step 11 — Auth controllers

Create `controllers/auth.controller.ts` with a matching `validator/auth.validator.ts` (Zod) so only well-formed request bodies reach the controller.

The controller's job is thin: parse the body, hand it to the service, return the response. The actual work lives in `services/auth.service.ts`. Errors bubble up through the `asyncHandler` wrapper.

Endpoints:

- `register`
- `login`
- `logout`
- `authStatusCheck`

`authStatusCheck` needs Passport + `passport-jwt` to verify the cookie — configured in `config/passport.config.ts`.

### Step 12 — Passport

`passport.use(JWTStrategy)` extracts the token from the cookie, verifies it, and decodes the `userId`. If valid, the user is attached to the request as `req.user`; otherwise it returns `null`.

The strategy is invoked by a `passportAuthenticateJwt` middleware, which is added to any route that needs auth. See `routes/auth.route.ts` — `/authStatusCheck` uses it.

---

## Socket.IO implementation

Real-time messaging and notifications. This section is long on purpose — Socket.IO is the only part of the stack that fundamentally changes how the server thinks about connections.

### Socket usage in this project (what, where, when, why)

This codebase uses Socket.IO mainly in `lib/socket.ts`, with service-layer emitters called from:

- `services/chat.service.ts` -> emits `chat:new` after chat creation.
- `services/message.service.ts` -> emits `message:new` and `chat:update` after message creation.

#### Event map (server side)

| Event name      | Emitted from                    | Audience                  | When it fires                            | Why it exists                                                 |
| --------------- | ------------------------------- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `online:users`  | `initializeSocket` connect/disconnect | Everyone (`io.emit`)      | User connects or disconnects             | Keep presence list synced in real-time                        |
| `chat:new`      | `emitNewChatToParticipants`     | Each `user:<participant>` | New chat is created                      | Instantly add new chat in participants' chat list             |
| `message:new`   | `emitNewMessageToChatRoom`      | `chat:<chatId>` room      | New message is saved                     | Live message delivery to users currently inside the chat room |
| `chat:update`   | `emitLastMessageToChatParticipants` | Each `user:<participant>` | New message is saved                     | Update chat sidebar preview (latest message, reorder, etc.)   |
| `chat:join`     | Client -> server listener       | One socket joins one room | User opens a chat                         | Subscribe that socket to `chat:<chatId>` stream              |
| `chat:leave`    | Client -> server listener       | One socket leaves room    | User leaves chat view                     | Stop receiving that chat's room events                        |

### Why Socket.IO needs an http server

Express handles request/response: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. One request, one response, done. That's all it does — and that's all it _can_ do.

A real-time connection is different. It opens once, stays open, and either side can send messages whenever. Express has no mechanism for that.

Here's the common misconception worth clearing up:

> "Doesn't Express have a built-in server under the hood?"

Sort of — but it's not really Express's server. When you call `app.listen()`, Express internally calls `http.createServer(this).listen()`. Node's `http` module created the server; Express just hid the step. So there has always been **one http server underneath Express** — `app.listen()` just doesn't show it to you.

Socket.IO needs a **reference** to that http server so it can attach itself to the same one Express uses. To pass it, we have to create the http server explicitly instead of letting `app.listen()` hide it. Same server either way — we're just naming it.

The shape:

```
              http server  (the door, the only thing on the port)
             /            \
        Express         Socket.IO
        (request         (live
         handler)        connections)
```

Express and Socket.IO are **peers** sitting on top of the same http server. They never talk to each other — the http server underneath sorts each arriving request to the right one: page requests go up to Express, WebSocket upgrade requests go up to Socket.IO. **One door, one port, two specialists.**

### Step 1 — Wrap Express in an explicit http server

```ts
import http from "http"

const app = express()
const server = http.createServer(app) // expose the http server
initializeSocket(server) // hand it to Socket.IO
server.listen(PORT) // NOW open the door
```

### Step 2 — Initialize Socket.IO

Everything Socket.IO-related lives in `lib/socket.ts`. The pattern:

1. Create the Socket.IO server, attached to our http server, with CORS configured.
2. Add an `io.use(...)` auth middleware that runs _before_ any connection is accepted — this proves the user's identity from their cookie.
3. Handle `connection` and register listeners (`chat:join`, `chat:leave`, `disconnect`).

```ts
export const initializeSocket = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: ENV.FRONTEND_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // --- Auth middleware: runs on every connection attempt ---
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie
      if (!rawCookie) return next(new Error("Unauthorized"))

      // Parse cookies properly — don't just split on "=".
      // A header like "session=abc; theme=dark" breaks naive splits.
      // In production use the `cookie` package: cookie.parse(rawCookie)
      const token = rawCookie.split("=")?.[1]?.trim()
      if (!token) return next(new Error("Unauthorized"))

      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string }
      if (!decoded) return next(new Error("Unauthorized"))

      socket.userId = decoded.userId // attach trusted identity
      next() // allow the connection
    } catch (error) {
      next(new Error("Internal Server Error at socket.io initialize"))
    }
  })

  // --- Connection handler: runs once per connected client ---
  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      console.log(`User with no userId disconnected with socket ${socket.id}`)
      return socket.disconnect()
    }

    const userId = socket.userId
    const newSocketId = socket.id
    console.log(`User ${userId} connected with socket ${newSocketId}`)

    // Track who is online (RAM-only — see notes below)
    onlineUsers.set(userId, newSocketId)
    io?.emit("online:users", Array.from(onlineUsers.keys()))

    // Personal room — lets us reach this user by userId, regardless of tabs
    socket.join(`user:${userId}`)

    // Join a chat room (after verifying the user belongs to it)
    socket.on(
      "chat:join",
      async (chatId: string, callback?: (err?: string) => void) => {
        try {
          await validateChatParticipantsService(chatId, userId)
          socket.join(`chat:${chatId}`)
          callback?.()
        } catch {
          callback?.("Error joining chat")
        }
      },
    )

    // Leave a chat room
    socket.on("chat:leave", async (chatId: string) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`)
        console.log(`User ${userId} left chat ${chatId}`)
      }
    })

    // Cleanup on disconnect
    socket.on("disconnect", () => {
      if (onlineUsers.has(userId)) {
        onlineUsers.delete(userId)
        io?.emit("online:users", Array.from(onlineUsers.keys()))
        console.log(`User ${userId} disconnected from socket ${newSocketId}`)
      }
    })
  })
}
```

---

### Socket.IO mental model — what's actually going on

This is the part to read slowly. The API is small; the model behind it is what makes complex apps make sense.

#### The two verbs

- **`emit`** — _speak_. Sends a named message with some data.
- **`on`** — _listen_. Has no audience — it's an ear that fires whenever a message with a matching name arrives over the network.

`emit` and `on` in the **same file do not trigger each other locally.** `on` only fires when a message arrives over the wire from the other side.

#### Emit's audience = whatever stands in front of `.emit`

| Code                         | Reaches                               |
| ---------------------------- | ------------------------------------- |
| `socket.emit(...)`           | Only this one connection (the sender) |
| `socket.broadcast.emit(...)` | Everyone **except** the sender        |
| `io.emit(...)`               | Everyone, including the sender        |

The word `broadcast` is the one that means "exclude me." Without it, no one is excluded.

#### The three objects to keep straight

| Object   | Count                     | What it is                                                                                                                                                                       |
| -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `io`     | **One per server**        | The switchboard. Holds the central registry of every socket and every room. **Not** a socket.                                                                                    |
| `socket` | **One per connected tab** | A single connection. Has `socket.id` (random, changes on every reconnect). The "member."                                                                                         |
| **room** | Many                      | A **name** (string) with a **list of sockets** attached. Not a socket. Lives inside `io`'s registry. Created the instant one socket joins a name; vanishes when the last leaves. |

A room is **a mailing list, not a member of the list.** You never "create a room" — joining a name brings it into existence.

#### Rooms = the three audiences, scoped to a subset

| Code                          | Reaches                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `io.to("name").emit(...)`     | Everyone **in the room**                                      |
| `socket.to("name").emit(...)` | Everyone in the room **except** the sender                    |
| `socket.join("name")`         | Tags this one socket into the room (no audience — just setup) |

#### `socket.id` vs `userId` — two different ids, two different jobs

| Id                    | Stable?                                                | Used for                                                                                                        |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `socket.id`           | **No** — changes every refresh, every tab is different | Identifying **the sender** of an incoming message                                                               |
| `userId` (your DB id) | **Yes**                                                | Used as a room name (`user:${userId}`) so you can reach **the user** regardless of how many tabs they have open |

For delivery, prefer rooms over `socket.id`. `socket.id` keeps only the _identity_ job. This is exactly what the code above does with `socket.join('user:${userId}')`.

#### RAM vs DB — the split that makes complex apps make sense

- **RAM** (sockets, `onlineUsers` map, room membership): who is connected **right now**. Disposable. Wiped on server restart.
- **DB** (users, chats, messages, chat memberships): everything that must **survive** offline users and restarts.

Pattern for every "send a message" handler:

1. **Save to DB** — permanent, becomes "the past."
2. **Emit to room** — live, delivered to everyone now.

History is read from the DB on open, not from sockets. Rooms are **rebuilt from DB membership every time someone connects** — the DB teaches RAM what rooms to recreate. RAM forgets; the DB remembers.

#### Auth on a socket — what differs and what doesn't

Express + Passport works because every request flows through `req`/`res`. Socket connections don't have that pipeline — they have a _handshake_. So Passport's Express middleware can't run here.

But the cookie still arrives. A WebSocket connection starts life as a normal HTTP upgrade request, and Socket.IO captures it for you at:

```ts
socket.handshake.headers.cookie
```

What changes vs. Express:

- **Extraction** — you parse the cookie header yourself (one line with the `cookie` package).
- **Verification** — should be the **same function** you use elsewhere (`jwt.verify(...)`, DB lookup, etc.). Don't reimplement auth for sockets; reuse it.

`io.use(...)` is Socket.IO's middleware. `next()` accepts the connection; `next(new Error(...))` rejects it. Attach the verified user (`socket.userId = ...`) — the parallel to Passport's `req.user`.

#### Things this codebase doesn't use yet, but are worth knowing exist

- **Acknowledgements** — pass a callback to `emit`; the receiver invokes it. Turns `emit` into request/response (the `chat:join` handler above uses this pattern).
- **Reconnection handling** — the client auto-reconnects; you decide what state to restore.
- **Redis adapter** — only matters with multiple server processes. Becomes the shared registry behind every `io` so rooms work across servers.
- **Namespaces** — a higher-level split than rooms. Mostly skippable until you have a clear reason.

---

### One-line summary to keep

> `on` is an ear; `emit` is a mouth, with the audience standing in front of it. `io` is the switchboard, sockets are members, rooms are named lists. RAM holds the present, the DB holds the past, and the DB teaches RAM what to rebuild after every restart.

---

## End-to-end workflows (beginner friendly)

### Workflow A: User connects and becomes "online"

1. Browser opens socket connection.
2. `io.use(...)` reads cookie from handshake and verifies JWT.
3. Server attaches `socket.userId`.
4. Connection accepted in `io.on("connection")`.
5. Socket joins personal room: `user:<userId>`.
6. Server updates `onlineUsers` map and emits `online:users`.

Result: everyone can see updated online presence.

### Workflow B: Create chat and notify participants

1. Client calls HTTP endpoint to create chat.
2. `createChatService` creates chat in DB using Prisma.
3. Service computes participant IDs.
4. Service calls `emitNewChatToParticipants(...)`.
5. Server emits `chat:new` to each personal room `user:<participantId>`.

Result: participants see new chat instantly in chat list.

### Workflow C: Send message and update both screen + sidebar

1. Client sends message via HTTP endpoint.
2. `sendMessageService` validates user/chat membership.
3. Message is saved in DB.
4. Chat's `latestMessageId` is updated in DB.
5. Server emits `message:new` to `chat:<chatId>` room.
6. Server emits `chat:update` to each participant's personal room.

Result:

- Open chat screen updates live (`message:new`).
- Chat list/preview updates live (`chat:update`).

### Why this split is important

- If user is currently **inside chat room**, they need message stream updates.
- If user is on **another screen**, they still need chat list updates.

So the app emits to both:

- **chat room** for conversation stream
- **personal rooms** for cross-app notifications

---

## Practical checklist for building a new project from this backend

If you recreate this architecture elsewhere, keep this order:

1. Build DB schema first (users/chats/messages/participants).
2. Build auth with JWT cookie for HTTP routes.
3. Initialize Socket.IO on same HTTP server.
4. Reuse JWT verification in socket middleware.
5. Create personal room per user: `user:<userId>`.
6. Gate `chat:join` with DB membership check.
7. In message handlers: **write DB -> emit room event -> emit personal updates**.
8. Keep RAM state minimal (`onlineUsers`, rooms) and treat DB as permanent truth.
