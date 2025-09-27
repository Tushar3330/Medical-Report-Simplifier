// Configuration for OpenAI models with fallbacks
const MODEL_CONFIG = {
    preferred: "gpt-4",
    fallback: "gpt-3.5-turbo",
    available: [
        "gpt-4",
        "gpt-4-turbo-preview", 
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k"
    ]
};

// OCR Configuration
const OCR_CONFIG = {
    confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.5,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/bmp,image/tiff').split(','),
    tesseractOptions: {
        logger: m => {
            if (m.status === 'recognizing text') {
                // Only log every 10% progress to reduce noise
                if (m.progress % 0.1 < 0.05) {
                    require('../utils/logger').debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        }
    }
};

// Normalization Configuration
const NORMALIZATION_CONFIG = {
    confidenceThreshold: parseFloat(process.env.NORMALIZATION_CONFIDENCE_THRESHOLD) || 0.7,
    maxRetries: 3,
    temperature: 0.1, // Low temperature for consistent results
    maxTokens: 2000
};

// Server Configuration
const SERVER_CONFIG = {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = {
    MODEL_CONFIG,
    OCR_CONFIG,
    NORMALIZATION_CONFIG,
    SERVER_CONFIG
};