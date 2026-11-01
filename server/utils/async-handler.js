/**
 * @description Higher-order function to catch errors in async express routes
 * Eliminates the need for repetitive try-catch blocks in controllers.
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
