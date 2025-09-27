const ocrService = require('./ocrService');
const normalizationService = require('./normalizationService');
const summaryService = require('./summaryService');
const logger = require('../utils/logger');

class MedicalReportService {
    constructor() {
        this.processingSteps = [
            'extraction',
            'normalization', 
            'summary',
            'final'
        ];
    }

    /**
     * Process complete medical report (main orchestration method)
     * @param {Object} input - Input data (text or file path)
     * @param {string} type - Input type ('text' or 'image')
     * @returns {Promise<Object>} Complete processed report
     */
    async processReport(input, type = 'text') {
        const processingId = Date.now().toString();
        logger.info(`Starting medical report processing [${processingId}] - Type: ${type}`);

        try {
            // Step 1: Extract test data
            logger.info(`[${processingId}] Step 1: Extracting test data`);
            const extractionResult = await this.extractTestData(input, type);

            if (!extractionResult.tests_raw || extractionResult.tests_raw.length === 0) {
                return {
                    status: 'unprocessed',
                    reason: 'No medical test data found in input',
                    step: 'extraction'
                };
            }

            // Step 2: Normalize tests
            logger.info(`[${processingId}] Step 2: Normalizing ${extractionResult.tests_raw.length} tests`);
            const normalizationResult = await this.normalizeTestData(
                extractionResult.tests_raw, 
                extractionResult.confidence
            );

            // Check for normalization failures
            if (normalizationResult.status === 'unprocessed') {
                return normalizationResult;
            }

            // Add delay between AI operations to prevent rate limiting
            await this.sleep(500); // 500ms delay

            // Step 3: Generate patient-friendly summary
            logger.info(`[${processingId}] Step 3: Generating patient summary`);
            const summaryResult = await this.generatePatientSummary(normalizationResult.tests);

            // Check for summary failures
            if (summaryResult.status === 'unprocessed') {
                return summaryResult;
            }

            // Step 4: Combine final result
            logger.info(`[${processingId}] Step 4: Finalizing report`);
            const finalResult = {
                tests: normalizationResult.tests,
                summary: summaryResult.summary,
                explanations: summaryResult.explanations,
                status: 'ok',
                processing_metadata: {
                    extraction_confidence: extractionResult.confidence,
                    normalization_confidence: normalizationResult.normalization_confidence,
                    tests_processed: normalizationResult.tests.length,
                    processing_id: processingId,
                    timestamp: new Date().toISOString()
                }
            };

            // Final validation
            this.validateFinalResult(finalResult);

            logger.info(`[${processingId}] Medical report processing completed successfully`);
            return finalResult;

        } catch (error) {
            logger.error(`[${processingId}] Medical report processing failed:`, error);
            
            // Return appropriate error response based on error type
            if (error.message.includes('hallucinated')) {
                return {
                    status: 'unprocessed',
                    reason: 'hallucinated tests not present in input',
                    step: 'validation'
                };
            }

            return {
                status: 'error',
                reason: `Processing failed: ${error.message}`,
                step: 'unknown'
            };
        }
    }

    /**
     * Extract test data from input (Step 1)
     * @param {Object} input - Input data
     * @param {string} type - Input type
     * @returns {Promise<Object>} Extraction result
     */
    async extractTestData(input, type) {
        try {
            if (type === 'image') {
                if (!input.path) {
                    throw new Error('Image file path is required');
                }
                return await ocrService.extractFromImage(input.path);
            } else if (type === 'text') {
                if (!input.text) {
                    throw new Error('Text content is required');
                }
                return await ocrService.extractFromText(input.text);
            } else {
                throw new Error(`Unsupported input type: ${type}`);
            }
        } catch (error) {
            logger.error('Test extraction failed:', error);
            throw error;
        }
    }

    /**
     * Normalize test data (Step 2)
     * @param {Array<string>} testsRaw - Raw test results
     * @param {number} confidence - Extraction confidence
     * @returns {Promise<Object>} Normalization result
     */
    async normalizeTestData(testsRaw, confidence) {
        try {
            return await normalizationService.normalizeTests(testsRaw, confidence);
        } catch (error) {
            logger.error('Test normalization failed:', error);
            throw error;
        }
    }

    /**
     * Generate patient summary (Step 3)
     * @param {Array<Object>} normalizedTests - Normalized test results
     * @returns {Promise<Object>} Summary result
     */
    async generatePatientSummary(normalizedTests) {
        try {
            return await summaryService.generateSummary(normalizedTests);
        } catch (error) {
            logger.error('Summary generation failed:', error);
            throw error;
        }
    }

    /**
     * Process individual steps for debugging/testing
     * @param {Array<string>} testsRaw - Raw test results
     * @param {number} confidence - Confidence score
     * @returns {Promise<Object>} Step-by-step results
     */
    async processStepByStep(testsRaw, confidence = 0.8) {
        const results = {
            step1_extraction: { tests_raw: testsRaw, confidence },
            step2_normalization: null,
            step3_summary: null,
            step4_final: null
        };

        try {
            // Step 2: Normalization
            results.step2_normalization = await this.normalizeTestData(testsRaw, confidence);
            
            if (results.step2_normalization.status === 'unprocessed') {
                return results;
            }

            // Step 3: Summary
            results.step3_summary = await this.generatePatientSummary(results.step2_normalization.tests);
            
            if (results.step3_summary.status === 'unprocessed') {
                return results;
            }

            // Step 4: Final
            results.step4_final = {
                tests: results.step2_normalization.tests,
                summary: results.step3_summary.summary,
                explanations: results.step3_summary.explanations,
                status: 'ok'
            };

            return results;

        } catch (error) {
            logger.error('Step-by-step processing failed:', error);
            throw error;
        }
    }

    /**
     * Validate final result before returning
     * @param {Object} result - Final result to validate
     */
    validateFinalResult(result) {
        // Required fields check
        const requiredFields = ['tests', 'summary', 'status'];
        for (const field of requiredFields) {
            if (!(field in result)) {
                throw new Error(`Missing required field in final result: ${field}`);
            }
        }

        // Tests validation
        if (!Array.isArray(result.tests) || result.tests.length === 0) {
            throw new Error('Final result must contain at least one test');
        }

        // Test structure validation
        for (const test of result.tests) {
            if (!test.name || typeof test.value !== 'number' || !test.unit || !test.status) {
                throw new Error('Invalid test structure in final result');
            }
        }

        // Summary validation
        if (!result.summary || typeof result.summary !== 'string' || result.summary.length < 10) {
            throw new Error('Invalid or missing summary in final result');
        }

        // Explanations validation
        if (result.explanations && !Array.isArray(result.explanations)) {
            throw new Error('Explanations must be an array');
        }

        // Status validation
        if (!['ok', 'unprocessed', 'error'].includes(result.status)) {
            throw new Error('Invalid status in final result');
        }

        logger.debug('Final result validation passed');
    }

    /**
     * Get processing statistics
     * @returns {Object} Service statistics
     */
    getStatistics() {
        return {
            service: 'medical-report-simplifier',
            version: '1.0.0',
            supported_formats: ['text', 'image'],
            supported_file_types: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'],
            max_file_size: '10MB',
            processing_steps: this.processingSteps,
            confidence_thresholds: {
                ocr: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.5,
                normalization: parseFloat(process.env.NORMALIZATION_CONFIDENCE_THRESHOLD) || 0.7
            }
        };
    }

    /**
     * Sleep utility for request spacing
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new MedicalReportService();