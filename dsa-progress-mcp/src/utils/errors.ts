import { Prisma } from "../generated/prisma/client.js";

/**
 * An error that is safe to show to the caller: `message` is written for the user, `status` is the
 * HTTP status it maps to and `code` is a stable machine-readable name. Anything else that is thrown
 * is treated as an internal error and its details are only logged.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }

  toJSON() {
    return { code: this.code, status: this.status, message: this.message };
  }
}

export class BadRequestError extends AppError {
  constructor(message = "The request is invalid.", options?: ErrorOptions) {
    super(400, "bad_request", message, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in first.", options?: ErrorOptions) {
    super(401, "unauthorized", message, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.", options?: ErrorOptions) {
    super(403, "forbidden", message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.", options?: ErrorOptions) {
    super(404, "not_found", message, options);
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = "Method not allowed.", options?: ErrorOptions) {
    super(405, "method_not_allowed", message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = "This already exists.", options?: ErrorOptions) {
    super(409, "conflict", message, options);
  }
}

export class InternalError extends AppError {
  constructor(message = "Something went wrong. Please try again.", options?: ErrorOptions) {
    super(500, "internal_error", message, options);
  }
}

/** A service this server depends on (e.g. Google) failed or returned something unusable. */
export class UpstreamError extends AppError {
  constructor(message = "An upstream service failed. Please try again.", options?: ErrorOptions) {
    super(502, "upstream_error", message, options);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "The service is temporarily unavailable. Please try again shortly.", options?: ErrorOptions) {
    super(503, "service_unavailable", message, options);
  }
}

/**
 * Turns anything thrown into an AppError. Known Prisma errors map to their matching status;
 * everything else becomes a generic InternalError so internals never reach the caller.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025": // Record required by the query was not found.
        return new NotFoundError(undefined, { cause: err });
      case "P2002": // Unique constraint failed.
        return new ConflictError(undefined, { cause: err });
      case "P1001": // Can't reach the database server.
      case "P1002":
      case "P2024": // Timed out waiting for a connection from the pool.
        return new ServiceUnavailableError(undefined, { cause: err });
    }
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new ServiceUnavailableError(undefined, { cause: err });
  }
  if (isClientHttpError(err)) {
    // Thrown by Express itself, e.g. a malformed or oversized request body.
    return new AppError(err.status, err.status === 400 ? "bad_request" : `http_${err.status}`, err.message, { cause: err });
  }
  return new InternalError(undefined, { cause: err });
}

/** An `http-errors` style 4xx error whose message is marked safe to expose. */
function isClientHttpError(err: unknown): err is Error & { status: number } {
  if (!(err instanceof Error)) return false;
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  return typeof status === "number" && status >= 400 && status < 500 && expose === true;
}

/** Converts `err` and logs it when it is a server-side failure (5xx), which the caller can't fix. */
export function handleError(scope: string, err: unknown): AppError {
  const appError = toAppError(err);
  if (appError.status >= 500) console.error(`[${scope}]`, appError.cause ?? appError);
  return appError;
}
