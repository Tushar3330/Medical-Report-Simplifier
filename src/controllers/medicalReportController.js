const medicalReportService = require('../services/medicalReportService');
const ocrService = require('../services/ocrService');
const normalizationService = require('../services/normalizationService');
const summaryService = require('../services/summaryService');
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

class MedicalReportController {
    /**
     * Process complete medical report (main endpoint)
     * Handles both text and image inputs
     */
    async processReport(req, res, next) {
        try {
            logger.info('Processing medical report request', {
                type: req.body.type || (req.file ? 'image' : 'text'),
                hasFile: !!req.file,
                textLength: req.body.text ? req.body.text.length : 0
            });

            let input, type;

            // Determine input type and prepare data
            if (req.file) {
                type = 'image';
                input = { buffer: req.file.buffer };
            } else if (req.body.text) {
                type = 'text';
                input = { text: req.body.text };
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'Either text or image file is required'
                });
            }

            // Process the report
            const result = await medicalReportService.processReport(input, type);

            // Return appropriate status code based on result
            const statusCode = result.status === 'ok' ? 200 : 
                              result.status === 'unprocessed' ? 422 : 500;

            res.status(statusCode).json(result);

        } catch (error) {
            logger.error('Report processing controller error:', error);
            next(error);
        }
    }

    /**
     * Extract test data only (Step 1)
     */
    async extractTests(req, res, next) {
        try {
            let result;

            if (req.file) {
                result = await ocrService.extractFromImage(req.file.buffer);
            } else if (req.body.text) {
                result = await ocrService.extractFromText(req.body.text);
            } else {
                return res.status(400).json({
                    status: 'error',
                    message: 'Either text or image file is required'
                });
            }

            res.status(200).json({
                ...result,
                step: 'extraction',
                status: 'ok'
            });

        } catch (error) {
            logger.error('Test extraction controller error:', error);
            next(error);
        }
    }

    /**
     * Normalize test data only (Step 2)
     */
    async normalizeTests(req, res, next) {
        try {
            const { tests_raw, confidence = 0.8 } = req.body;

            if (!tests_raw || !Array.isArray(tests_raw) || tests_raw.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'tests_raw array is required'
                });
            }

            const result = await normalizationService.normalizeTests(tests_raw, confidence);
            
            const statusCode = result.status === 'unprocessed' ? 422 : 200;
            res.status(statusCode).json({
                ...result,
                step: 'normalization'
            });

        } catch (error) {
            logger.error('Test normalization controller error:', error);
            next(error);
        }
    }

    /**
     * Generate patient summary only (Step 3)
     */
    async generateSummary(req, res, next) {
        try {
            const { tests } = req.body;

            if (!tests || !Array.isArray(tests) || tests.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Normalized tests array is required'
                });
            }

            const result = await summaryService.generateSummary(tests);
            
            const statusCode = result.status === 'unprocessed' ? 422 : 200;
            res.status(statusCode).json({
                ...result,
                step: 'summary'
            });

        } catch (error) {
            logger.error('Summary generation controller error:', error);
            next(error);
        }
    }

    /**
     * Process step by step for debugging
     */
    async processStepByStep(req, res, next) {
        try {
            const { tests_raw, confidence = 0.8 } = req.body;

            if (!tests_raw || !Array.isArray(tests_raw)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'tests_raw array is required'
                });
            }

            const result = await medicalReportService.processStepByStep(tests_raw, confidence);

            res.status(200).json({
                status: 'ok',
                ...result
            });

        } catch (error) {
            logger.error('Step-by-step processing controller error:', error);
            next(error);
        }
    }

    /**
     * Get service statistics and health info
     */
    async getServiceInfo(req, res, next) {
        try {
            const stats = medicalReportService.getStatistics();
            
            res.status(200).json({
                status: 'ok',
                service_info: stats,
                api_endpoints: {
                    'POST /process': 'Process complete medical report (text or image)',
                    'POST /extract': 'Extract test data only (Step 1)',
                    'POST /normalize': 'Normalize test data only (Step 2)', 
                    'POST /summarize': 'Generate patient summary only (Step 3)',
                    'POST /debug': 'Process step-by-step for debugging',
                    'GET /info': 'Get service information'
                }
            });

        } catch (error) {
            logger.error('Service info controller error:', error);
            next(error);
        }
    }

    /**
     * Validate uploaded file
     */
    validateFileUpload(req, res, next) {
        if (req.file) {
            logger.info('File uploaded successfully', {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
        }
        next();
    }

    /**
     * Check AI API health and model availability
     */
    async aiHealthCheck(req, res, next) {
        try {
            const health = await aiService.checkHealth();
            res.json(health);
        } catch (error) {
            logger.error('AI Health check failed:', error);
            next(error);
        }
    }

    /**
     * Get AI provider information
     */
    async getProviderInfo(req, res, next) {
        try {
            // Create a safe response object directly
            const providerInfo = {
                current_provider: process.env.AI_PROVIDER || 'gemini',
                providers_available: {
                    openai: {
                        configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'),
                        api_key_present: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here')
                    },
                    gemini: {
                        configured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here'),
                        api_key_present: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here')
                    }
                },
                timestamp: new Date().toISOString()
            };
            
            res.json({
                status: 'ok',
                ...providerInfo
            });
        } catch (error) {
            logger.error('Provider info failed:', error);
            next(error);
        }
    }

    /**
     * Basic health check
     */
    healthCheck(req, res) {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            services: {
                ocr: 'enabled',
                normalization: 'enabled',
                summary: 'enabled'
            }
        });
    }
}

module.exports = new MedicalReportController();