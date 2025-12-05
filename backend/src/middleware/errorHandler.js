const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Resource already exists';
  }
  
  if (err.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }
  
  if (err.code === '23502') { // Not null violation
    statusCode = 400;
    message = 'Required field is missing';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
