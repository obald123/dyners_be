export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly expose = true
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Invalid credentials.") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden.") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Resource") {
    super(404, `${entity} not found.`);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(409, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(429, message);
  }
}
