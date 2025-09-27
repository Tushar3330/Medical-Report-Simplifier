const aiService = require('./aiService');
const logger = require('../utils/logger');

class NormalizationService {
    constructor() {
        this.confidenceThreshold = parseFloat(process.env.NORMALIZATION_CONFIDENCE_THRESHOLD) || 0.7;
    }

    /**
     * Normalize medical test results using AI
     * @param {Array<string>} testsRaw - Raw test results
     * @param {number} inputConfidence - Confidence from OCR/text extraction
     * @returns {Promise<Object>} Normalized tests with confidence
     */
    async normalizeTests(testsRaw, inputConfidence = 0.8) {
        try {
            logger.info(`Normalizing ${testsRaw.length} medical tests`);

            if (!testsRaw || testsRaw.length === 0) {
                throw new Error('No test results provided for normalization');
            }

            // Create a comprehensive prompt for test normalization
            const prompt = this.createNormalizationPrompt(testsRaw);

            // Use the unified AI service
            const aiResponse = await aiService.generateCompletion(
                this.getSystemPrompt(),
                prompt,
                {
                    temperature: 0.1, // Low temperature for consistency
                    maxTokens: 2000
                }
            );

            const aiResponseContent = aiResponse.content;
            logger.debug('AI normalization response:', aiResponseContent);

            // Parse the AI response
            const normalizedData = this.parseNormalizationResponse(aiResponseContent);

            // Validate the normalization results
            this.validateNormalization(normalizedData, testsRaw);

            // Calculate normalization confidence
            const normalizationConfidence = this.calculateNormalizationConfidence(
                normalizedData, 
                testsRaw, 
                inputConfidence
            );

            logger.info(`Test normalization completed with confidence: ${normalizationConfidence.toFixed(2)}`);

            return {
                tests: normalizedData.tests,
                normalization_confidence: Math.round(normalizationConfidence * 100) / 100,
                processing_notes: normalizedData.notes || []
            };

        } catch (error) {
            logger.error('Test normalization failed:', error);
            
            // Fallback: Return basic normalization
            if (error.message.includes('hallucinated') || error.message.includes('invalid')) {
                return {
                    status: 'unprocessed',
                    reason: error.message
                };
            }

            // If AI is unavailable (503, 404, etc.), provide basic fallback
            if (error.message.includes('503') || error.message.includes('404') || 
                error.message.includes('overload') || error.message.includes('not found') ||
                error.message.includes('disabled') || error.message.includes('temporarily')) {
                logger.warn('AI service unavailable, providing basic normalization fallback');
                return this.createBasicNormalization(testsRaw, inputConfidence);
            }

            throw new Error(`Test normalization failed: ${error.message}`);
        }
    }

    /**
     * Get system prompt for test normalization
     * @returns {string} System prompt
     */
    getSystemPrompt() {
        return `You are a medical data normalization expert. Your task is to standardize medical test results into a consistent JSON format.

CRITICAL RULES:
1. ONLY process tests that are clearly present in the input
2. DO NOT add, invent, or hallucinate any test results
3. If a test name is unclear but values/units are clear, use the closest standard medical test name
4. Provide realistic reference ranges based on standard medical guidelines
5. Status should be "low", "high", "normal", or "critical" based on reference ranges
6. If you cannot confidently normalize a test, exclude it from results

Standard medical test names to use when possible:
- Hemoglobin (not Hgb, Haemoglobin)
- WBC (White Blood Cell Count)
- RBC (Red Blood Cell Count)
- Glucose
- Cholesterol (Total, LDL, HDL)
- Creatinine
- Blood Urea Nitrogen (BUN)
- Platelets
- Hematocrit

Common units:
- g/dL (grams per deciliter)
- mg/dL (milligrams per deciliter)
- /μL or /uL (per microliter)
- % (percentage)
- mmol/L (millimoles per liter)

Response format must be valid JSON with this structure:
{
  "tests": [
    {
      "name": "Standard Test Name",
      "value": numeric_value,
      "unit": "standard_unit",
      "status": "low|normal|high|critical",
      "ref_range": {"low": min_value, "high": max_value}
    }
  ],
  "notes": ["Any processing notes or concerns"]
}`;
    }

    /**
     * Create normalization prompt from raw tests
     * @param {Array<string>} testsRaw - Raw test results
     * @returns {string} Formatted prompt
     */
    createNormalizationPrompt(testsRaw) {
        return `Please normalize these medical test results. Extract the test name, value, unit, and determine status based on standard reference ranges:

RAW TEST RESULTS:
${testsRaw.map((test, index) => `${index + 1}. ${test}`).join('\n')}

Requirements:
- Only process tests clearly visible in the input above
- Use standard medical test names
- Provide appropriate reference ranges for each test
- Determine status (low/normal/high/critical) based on the value and reference range
- If a test cannot be confidently parsed, do not include it

Return valid JSON only, no additional text.`;
    }

    /**
     * Parse AI response into structured data
     * @param {string} response - AI response
     * @returns {Object} Parsed normalization data
     */
    parseNormalizationResponse(response) {
        try {
            // Ensure response is a string
            const responseText = typeof response === 'string' ? response : 
                                response?.content || 
                                response?.text || 
                                JSON.stringify(response);
            
            logger.debug('Parsing normalization response text:', responseText);
            
            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error(`No valid JSON found in AI response: ${responseText.substring(0, 200)}...`);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate structure
            if (!parsed.tests || !Array.isArray(parsed.tests)) {
                throw new Error('Invalid response structure: missing tests array');
            }

            // Validate each test
            parsed.tests.forEach((test, index) => {
                if (!test.name || typeof test.value !== 'number' || !test.unit || !test.status) {
                    throw new Error(`Invalid test structure at index ${index}`);
                }

                if (!test.ref_range || typeof test.ref_range.low !== 'number' || typeof test.ref_range.high !== 'number') {
                    throw new Error(`Invalid reference range at index ${index}`);
                }

                // Validate status values
                const validStatuses = ['low', 'normal', 'high', 'critical'];
                if (!validStatuses.includes(test.status.toLowerCase())) {
                    test.status = this.determineStatus(test.value, test.ref_range);
                }
            });

            return parsed;

        } catch (error) {
            logger.error('Failed to parse normalization response:', error);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Validate normalization results against input
     * @param {Object} normalizedData - Normalized test data
     * @param {Array<string>} testsRaw - Original raw tests
     */
    validateNormalization(normalizedData, testsRaw) {
        // Check if we have too many tests compared to input (hallucination check)
        if (normalizedData.tests.length > testsRaw.length * 1.5) {
            throw new Error('hallucinated tests not present in input - too many normalized tests');
        }

        // Check if all normalized tests have corresponding raw data
        const rawTestsLower = testsRaw.join(' ').toLowerCase();
        
        for (const test of normalizedData.tests) {
            const testNameVariations = this.getTestNameVariations(test.name);
            const hasMatch = testNameVariations.some(variation => 
                rawTestsLower.includes(variation.toLowerCase())
            );

            if (!hasMatch) {
                logger.warn(`Potential hallucination detected for test: ${test.name}`);
                // Allow some flexibility for common abbreviations and synonyms
                if (!this.isCommonTestVariation(test.name, rawTestsLower)) {
                    throw new Error(`hallucinated tests not present in input - ${test.name} not found in original data`);
                }
            }
        }

        // Validate reference ranges are reasonable
        for (const test of normalizedData.tests) {
            if (!this.isReasonableReferenceRange(test.name, test.ref_range, test.unit)) {
                logger.warn(`Unusual reference range for ${test.name}: ${JSON.stringify(test.ref_range)} ${test.unit}`);
            }
        }
    }

    /**
     * Get common variations of a test name
     * @param {string} testName - Standard test name
     * @returns {Array<string>} Variations
     */
    getTestNameVariations(testName) {
        const variations = {
            'Hemoglobin': ['hemoglobin', 'hgb', 'hb', 'haemoglobin'],
            'WBC': ['wbc', 'white blood cell', 'white blood cells', 'leukocytes'],
            'RBC': ['rbc', 'red blood cell', 'red blood cells', 'erythrocytes'],
            'Glucose': ['glucose', 'blood sugar', 'blood glucose'],
            'Cholesterol': ['cholesterol', 'chol', 'total cholesterol'],
            'Creatinine': ['creatinine', 'creat', 'cr'],
            'Blood Urea Nitrogen': ['bun', 'blood urea nitrogen', 'urea nitrogen', 'blood urea'],
            'Platelets': ['platelets', 'plt', 'platelet count'],
            'Hematocrit': ['hematocrit', 'hct', 'haematocrit']
        };

        return variations[testName] || [testName.toLowerCase()];
    }

    /**
     * Check if test name is a common variation
     * @param {string} testName - Test name to check
     * @param {string} rawText - Raw text to search in
     * @returns {boolean} Whether it's a reasonable variation
     */
    isCommonTestVariation(testName, rawText) {
        // Define lenient matching for very common tests
        const commonTests = {
            'hemoglobin': ['hgb', 'hb', 'hemg', 'haem'],
            'wbc': ['white', 'leuk'],
            'glucose': ['sugar', 'gluc'],
            'cholesterol': ['chol'],
            'creatinine': ['creat', 'cr'],
            'blood urea nitrogen': ['bun', 'urea'],
            'bun': ['blood urea', 'urea nitrogen']
        };

        const testLower = testName.toLowerCase();
        for (const [standard, variations] of Object.entries(commonTests)) {
            if (testLower.includes(standard)) {
                return variations.some(variation => rawText.includes(variation));
            }
        }

        return false;
    }

    /**
     * Check if reference range is reasonable for the test
     * @param {string} testName - Test name
     * @param {Object} refRange - Reference range object
     * @param {string} unit - Unit of measurement
     * @returns {boolean} Whether range is reasonable
     */
    isReasonableReferenceRange(testName, refRange, unit) {
        const standardRanges = {
            'Hemoglobin': { 'g/dL': { low: 10, high: 18 } },
            'WBC': { '/μL': { low: 3000, high: 15000 }, '/uL': { low: 3000, high: 15000 } },
            'Glucose': { 'mg/dL': { low: 60, high: 140 } },
            'Cholesterol': { 'mg/dL': { low: 120, high: 300 } },
            'Creatinine': { 'mg/dL': { low: 0.5, high: 2.0 } },
            'Platelets': { '/μL': { low: 100000, high: 500000 }, '/uL': { low: 100000, high: 500000 } }
        };

        const expectedRange = standardRanges[testName]?.[unit];
        if (!expectedRange) return true; // No standard to check against

        const rangeDiff = refRange.high - refRange.low;
        const expectedDiff = expectedRange.high - expectedRange.low;

        // Check if range is within reasonable bounds (within 50% of expected range)
        return refRange.low >= expectedRange.low * 0.5 && 
               refRange.high <= expectedRange.high * 1.5 &&
               rangeDiff > 0;
    }

    /**
     * Determine status based on value and reference range
     * @param {number} value - Test value
     * @param {Object} refRange - Reference range
     * @returns {string} Status
     */
    determineStatus(value, refRange) {
        if (value < refRange.low * 0.7) return 'critical';
        if (value < refRange.low) return 'low';
        if (value > refRange.high * 1.3) return 'critical';
        if (value > refRange.high) return 'high';
        return 'normal';
    }

    /**
     * Create basic normalization when AI is unavailable
     * @param {Array<string>} testsRaw - Raw test results
     * @param {number} inputConfidence - Input confidence
     * @returns {Object} Basic normalized data
     */
    createBasicNormalization(testsRaw, inputConfidence) {
        const tests = [];
        
        testsRaw.forEach(rawTest => {
            const basicTest = this.parseBasicTest(rawTest);
            if (basicTest) {
                tests.push(basicTest);
            }
        });

        return {
            tests: tests,
            normalization_confidence: Math.max(inputConfidence * 0.5, 0.3), // Lower confidence for basic parsing
            processing_notes: ['AI normalization unavailable - using basic parsing fallback']
        };
    }

    /**
     * Parse a single test with basic regex patterns
     * @param {string} rawTest - Raw test string
     * @returns {Object|null} Basic test object or null
     */
    parseBasicTest(rawTest) {
        logger.debug('Parsing basic test:', rawTest);
        
        // Multiple patterns to match different formats
        const patterns = [
            // Pattern 1: "TestName: Value Unit" 
            /([a-zA-Z\s]+):\s*([0-9.,]+)\s*([a-zA-Z/μ%]+)/i,
            // Pattern 2: "TestName Value Unit"
            /([a-zA-Z\s]+)\s+([0-9.,]+)\s+([a-zA-Z/μ%μL]+)/i,
            // Pattern 3: "TestName Value Unit (Status)"
            /([a-zA-Z\s]+)\s+([0-9.,]+)\s+([a-zA-Z/μ%μL]+)\s*\([^)]+\)/i
        ];
        
        let match = null;
        for (const pattern of patterns) {
            match = rawTest.match(pattern);
            if (match) break;
        }
        
        if (!match) {
            logger.warn('No pattern matched for test:', rawTest);
            return null;
        }

        const [, name, valueStr, unit] = match;
        const value = parseFloat(valueStr.replace(/,/g, ''));
        
        if (isNaN(value)) {
            logger.warn('Invalid value parsed:', valueStr);
            return null;
        }

        // Clean up test name
        const cleanName = name.trim().replace(/^(CBC:\s*)?/i, '');

        // Basic reference ranges (very conservative)
        const refRange = this.getBasicReferenceRange(cleanName, unit.trim());
        const status = this.determineBasicStatus(value, refRange);

        const result = {
            name: cleanName,
            value: value,
            unit: unit.trim(),
            status: status,
            ref_range: refRange
        };

        logger.debug('Parsed basic test result:', result);
        return result;
    }

    /**
     * Get basic reference ranges for common tests
     * @param {string} testName - Test name
     * @param {string} unit - Unit
     * @returns {Object} Reference range
     */
    getBasicReferenceRange(testName, unit) {
        const ranges = {
            'hemoglobin': { 
                'g/dl': { low: 12, high: 16 },
                'g/dl': { low: 12, high: 16 }
            },
            'hgb': { 
                'g/dl': { low: 12, high: 16 }
            },
            'wbc': { 
                '/ul': { low: 4000, high: 11000 }, 
                '/μl': { low: 4000, high: 11000 },
                '/ul': { low: 4000, high: 11000 },
                'ul': { low: 4000, high: 11000 },
                'μl': { low: 4000, high: 11000 }
            },
            'white blood cell': { 
                '/ul': { low: 4000, high: 11000 }, 
                '/μl': { low: 4000, high: 11000 }
            },
            'glucose': { 
                'mg/dl': { low: 70, high: 100 } 
            },
            'bun': { 
                'mg/dl': { low: 7, high: 20 } 
            },
            'blood urea nitrogen': { 
                'mg/dl': { low: 7, high: 20 } 
            },
            'creatinine': { 
                'mg/dl': { low: 0.6, high: 1.2 } 
            }
        };

        const testLower = testName.toLowerCase();
        const unitLower = unit.toLowerCase().replace(/^\//,''); // Remove leading slash
        
        // Try exact match first
        for (const [test, unitRanges] of Object.entries(ranges)) {
            if (testLower.includes(test)) {
                // Try with and without leading slash
                if (unitRanges[unitLower] || unitRanges['/' + unitLower]) {
                    return unitRanges[unitLower] || unitRanges['/' + unitLower];
                }
            }
        }

        // Default ranges based on unit patterns
        if (unitLower.includes('g/dl')) {
            return { low: 10, high: 18 };
        } else if (unitLower.includes('ul') || unitLower.includes('μl')) {
            return { low: 3000, high: 12000 };
        } else if (unitLower.includes('mg/dl')) {
            return { low: 70, high: 140 };
        }

        // Fallback safe range
        return { low: 0, high: 1000 };
    }

    /**
     * Determine basic status
     * @param {number} value - Test value
     * @param {Object} refRange - Reference range
     * @returns {string} Status
     */
    determineBasicStatus(value, refRange) {
        if (value < refRange.low) return 'low';
        if (value > refRange.high) return 'high';
        return 'normal';
    }

    /**
     * Calculate confidence score for normalization
     * @param {Object} normalizedData - Normalized data
     * @param {Array<string>} testsRaw - Raw tests
     * @param {number} inputConfidence - Input confidence
     * @returns {number} Confidence score
     */
    calculateNormalizationConfidence(normalizedData, testsRaw, inputConfidence) {
        let confidence = inputConfidence * 0.7; // Base confidence from input

        // Factor 1: Coverage - how many raw tests were successfully normalized
        const coverageRatio = normalizedData.tests.length / testsRaw.length;
        confidence += Math.min(coverageRatio * 0.2, 0.2);

        // Factor 2: Test quality - do tests have reasonable values and ranges
        let qualityScore = 0;
        normalizedData.tests.forEach(test => {
            if (this.isReasonableReferenceRange(test.name, test.ref_range, test.unit)) {
                qualityScore += 1;
            }
            if (test.value > 0 && test.value < test.ref_range.high * 10) {
                qualityScore += 1;
            }
        });
        confidence += Math.min((qualityScore / (normalizedData.tests.length * 2)) * 0.1, 0.1);

        // Factor 3: Penalty for potential issues
        if (normalizedData.notes && normalizedData.notes.length > 0) {
            confidence -= 0.05;
        }

        return Math.min(Math.max(confidence, 0), 1);
    }
}

module.exports = new NormalizationService();