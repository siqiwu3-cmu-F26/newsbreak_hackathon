export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message, ...error.extra });
  }
  // body-parser rejects oversized uploads before the route runs.
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "That upload is too large" });
  }
  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
}
