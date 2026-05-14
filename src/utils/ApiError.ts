export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(msg: string): ApiError {
    return new ApiError(400, msg);
  }

  static unauthorized(msg = 'Unauthorized'): ApiError {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden'): ApiError {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found'): ApiError {
    return new ApiError(404, msg);
  }

  static conflict(msg: string): ApiError {
    return new ApiError(409, msg);
  }

  static tooMany(msg = 'Too many requests'): ApiError {
    return new ApiError(429, msg);
  }

  static internal(msg = 'Internal server error'): ApiError {
    return new ApiError(500, msg, false);
  }
}
