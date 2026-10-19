// Small error type so controllers can return a specific status + friendly message.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Malformed MongoDB ObjectId in a URL parameter
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid patient id' });
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }

  // Log the details on the server, but never send raw database errors to the client.
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

module.exports = { ApiError, notFound, errorHandler };
