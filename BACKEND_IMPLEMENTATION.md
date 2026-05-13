# AI Chat App Backend

This document explains the initial backend setup steps and core package decisions for the AI Chat App.

## Step 1: Initialize the project

Run:

`npm init -y`

This creates `package.json`, which tracks scripts, dependencies, and project metadata.

## Step 2: Install runtime libraries

Install backend runtime packages:

`pnpm add bcryptjs cloudinary cors cookie-parser dotenv express helmet jsonwebtoken passport passport-jwt socket.io zod`

### Note

- Use `pnpm add <package>` to add a new package.
- Use `pnpm install` to install packages already listed in `package.json` (commonly after cloning the project).

## Step 3: Install type packages and dev tools

Install type packages:

`pnpm add @types/bcryptjs @types/cookie-parser @types/cors @types/dotenv @types/express @types/jsonwebtoken @types/node @types/passport @types/passport-jwt`

Install development-only tools:

`pnpm add -D nodemon ts-node typescript`

### Note

`dotenv` and `bcryptjs` already include built-in TypeScript types.  
`@types/dotenv` and `@types/bcryptjs` are optional and usually unnecessary.

## Step 4: Create TypeScript config

Initialize TypeScript config:

`npx tsc --init`

Or create `tsconfig.json` manually and use:

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

## Step 5: Create `nodemon.json` file

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node ./src/index.ts"
}
```

## Step 6: Set `.env` and `.gitignore` file

Add the Node_env, db, and jwt_secret, frontend_origin and other sensitive api keys and url in .env

Add folders path that don't need in git.

## Step 7: Create utils and config files

- `utils/get-env.ts` file to get `.env` values
- `utils/app-error.ts` to get the formated error class based on params: HTTPSTATUS, ErrorCode, and custom message, such as InternalServerException, NotFoundException, BadRequestException, and so on.
- `config/evn.config.ts` file to ask the value from `utls/get-env.ts`
- `config/https.config.ts` file to get the HTTPSTATUS and its Types, refer to the exact file to get the full explaination

## Step 8: Create middleware

- `middleware/asyncHandler.middleware.ts` to centeralized the **try/catch** for all controller as asyncHandler act as wrapper for all the controller and pass the error to next(error)
- `middleware/errorHandler.middleware.ts` catches all the error passed by **next(error)** and return the error specific to the conditions: 404, 500 and so on with the help of, `utils/app-error.ts`, AppError Class to call custom Exceptions.

## Step 9: Setting up Database with Prisma Postgres using Neon

### Step 1: Install required packages

`pnpm add prisma @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv`

#### Note: Details guide in [Prisma Docs](https://www.prisma.io/docs/prisma-orm/quickstart/prisma-postgres)

1. Initalized the Prisma ORM CLI

`pnpm dlx prisma` || `npx prisma`

2. Create Prisma ORM project by creating your Prisma Schema file with the following command

`pnpm dlx prisma init --output ../generated/prisma` || `npx prisma init --output ../generated/prisma`

- Creates a `prisma/` directory with a `schema.prisma` file containing your database connection and schema models
- Creates a .env file in the root directory for environment variables
- Creates a `prisma.config.ts` file for Prisma configuration

**_Note: You can change the generated output file path from `prisma/schema.prisma`_**

3. Create singleton Prisma Instance in `lib/prisma.ts`
4. Create `config/database.config.ts` file to connect to DB.
5. Create DB models/ table in `prisma/schema.prisma` file
   - npx prisma migrate dev --name model-created-for-user-chat-message // created migration sql file and table in db
   - npx prisma generate // generate the Type or ORM file in specified output path and prisma client needed for `lib/prisma.ts`

## Step 10: Setting up the Cookie

1. Create Types for Expires and Cookie
2. Create `setJwtAuthCookie` function accepting the `res` and `userId` so that userId can become payload with expiresIn from env to create token.
3. Set the cookie in `res` for browser with options:

- maxAge: to auto delete cookie from browser once it reaches age.
- secure: to either let send cookie in http or https
- sameSite: to either let cookie send from the other site in bg or from backlinks, or only from the same url no matter what.

4. Create `clearJwtAuthCookie` function to clear the cookie in response.

## Step 11: Create controllers for route

Create `controllers/auth.controller.ts` with its `validator/auth.validator.ts` for req.body so that only intended body or data comes in.

- this contains imported services for the controller from `services/auth.service.ts` which handles the core logic as controller only parse the body, sends to service and return either error handled by wrapper `asyncHandler()` in controller or return the response.
- `register`, `login`, `logout`, and `authStatus`

For the `authStatusCheck` we need `passport` and `passport-jwt` to verify the cookie which is created in `config/passport.config.ts`

## Step 12: Setup Passport

Set the `passport.use(JWTStrategy)` which extract the token from cookie and decode to get the userId which then validates if user should be passed in next middleware or null or empty object.

And this stragegy is called by `passportAuthenticateJwt` middleware which passes **jwt** as strategy to get the above JWTStrategy check on each route, upon jwt checking success user is attached to request as `req.user` which can be used for further logic.

For reference: look into `routes/auth.route.ts` which uses `passportAuthenticateJwt` middleware in `/authStatusCheck`
