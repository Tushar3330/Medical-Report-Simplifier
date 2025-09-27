const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error(`Error: ${error.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // OpenAI API errors
    if (err.name === 'OpenAIError') {
        error.message = 'AI service temporarily unavailable. Please try again later.';
        error.statusCode = 503;
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File too large. Maximum size is 10MB.';
        error.statusCode = 413;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error.message = 'Invalid file field or too many files.';
        error.statusCode = 400;
    }

    // Validation errors
    if (err.isJoi) {
        error.message = err.details.map(detail => detail.message).join(', ');
        error.statusCode = 400;
    }

    // OCR errors
    if (err.name === 'OCRError') {
        error.message = 'Failed to process image. Please ensure the image is clear and contains readable text.';
        error.statusCode = 422;
    }

    res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            details: error 
        })
    });
};

module.exports = errorHandler;