export const HTTPSTATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

// How this type works:
// 1) `typeof HTTPSTATUS` converts the runtime object into its type shape.
//    Result type is roughly:
//    { readonly OK: 200; readonly CREATED: 201; ... }
//
// 2) `keyof typeof HTTPSTATUS` extracts all keys as a union:
//    "OK" | "CREATED" | "BAD_REQUEST" | "UNAUTHORIZED" | ...
//
// 3) `(typeof HTTPSTATUS)[keyof typeof HTTPSTATUS]` uses an indexed access type.
//    Think of `T[K]` as: "from object type T, get value type(s) at key(s) K".
//    Since K is a union of all keys, T[K] becomes a union of all values:
//    200 | 201 | 400 | 401 | 403 | 404 | 500
//
// Why `as const` matters:
// - With `as const`, values stay literal (200, 201, ...), so union is exact.
// - Without it, values widen to `number`, and final type becomes just `number`.
export type HttpStatusCodeType = (typeof HTTPSTATUS)[keyof typeof HTTPSTATUS]
