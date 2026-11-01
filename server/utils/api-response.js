/**
 * @description Standardized Response format for successful requests
 */
class ApiResponse {
  constructor(statusCode, message, payload = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.payload = payload;
  }

  /**
   * Send JSON response directly to client
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      payload: this.payload,
    });
  }
}

/**
 * @description Standardized Error format for failed requests
 */
class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.payload = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * @description Central error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  let error = err;

  /* ---------------- MONGOOSE CAST ERROR ---------------- */
  if (err.name === "CastError") {
    error = new ApiError(400, "Invalid ID format");
  }

  /* ---------------- DUPLICATE KEY ERROR ---------------- */
  if (err.code === 11000) {
    error = new ApiError(400, "Duplicate field value");
  }

  /* ---------------- FALLBACK FOR UNHANDLED ERRORS ---------------- */
  if (!(error instanceof ApiError)) {
    error = new ApiError(500, "Internal Server Error");
  }

  return res.status(error.statusCode).json({
    success: error.success,
    statusCode: error.statusCode,
    message: error.message,
    payload: error.payload,
    errors: error.errors,
  });
};

export { ApiResponse, ApiError, globalErrorHandler };