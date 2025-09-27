const Joi = require('joi');

// Validation schema for text input
const textInputSchema = Joi.object({
    text: Joi.string()
        .required()
        .min(10)
        .max(5000)
        .pattern(/[a-zA-Z]/) // Must contain at least one letter
        .messages({
            'string.empty': 'Text input is required',
            'string.min': 'Text must be at least 10 characters long',
            'string.max': 'Text must not exceed 5000 characters',
            'string.pattern.base': 'Text must contain alphabetic characters'
        })
});

// Validation for test normalization
const normalizeTestsSchema = Joi.object({
    tests_raw: Joi.array()
        .items(Joi.string().min(3))
        .required()
        .min(1)
        .messages({
            'array.min': 'At least one test result is required',
            'array.base': 'Tests must be provided as an array'
        }),
    confidence: Joi.number()
        .min(0)
        .max(1)
        .required()
});

// Validation for final processing
const processReportSchema = Joi.alternatives().try(
    // Direct text input (legacy support)
    Joi.object({
        text: Joi.string().required().min(10).max(5000)
    }),
    // Explicit type with text
    Joi.object({
        type: Joi.string().valid('text').required(),
        text: Joi.string().required().min(10).max(5000)
    }),
    // Image type (file upload)
    Joi.object({
        type: Joi.string().valid('image').required(),
        // File validation handled by multer middleware
    })
);

const validateTextInput = (req, res, next) => {
    const { error } = textInputSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message,
            field: error.details[0].path[0]
        });
    }
    next();
};

const validateNormalizeTests = (req, res, next) => {
    const { error } = normalizeTestsSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message,
            field: error.details[0].path[0]
        });
    }
    next();
};

const validateProcessReport = (req, res, next) => {
    // Skip validation if file upload (handled by multer)
    if (req.file) {
        req.body.type = 'image';
        return next();
    }

    // Use the proper processReportSchema that supports type field
    const { error } = processReportSchema.validate(req.body);
    if (error) {
        console.log('Process report validation error:', error.details);
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message,
            field: error.details[0].path[0]
        });
    }
    
    next();
};

module.exports = {
    validateTextInput,
    validateNormalizeTests,
    validateProcessReport,
    textInputSchema,
    normalizeTestsSchema,
    processReportSchema
};