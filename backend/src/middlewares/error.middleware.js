/**
 * Errors the handler.
 * @param {Error} err - The error object.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The Express next middleware function.
 */
const errorHandler = (err, req, res, next) => {
    if (err instanceof URIError) {
        return res.status(400).json({
            success: false,
            message: 'Failed to decode URI'
        });
    }

    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
