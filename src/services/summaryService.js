const aiService = require('./aiService');
const logger = require('../utils/logger');

class SummaryService {
    constructor() {
        // No need for direct AI client initialization
    }

    /**
     * Generate patient-friendly explanations for medical tests
     * @param {Array<Object>} normalizedTests - Normalized test results
     * @returns {Promise<Object>} Patient-friendly summary
     */
    async generateSummary(normalizedTests) {
        try {
            logger.info(`Generating patient-friendly summary for ${normalizedTests.length} tests`);

            if (!normalizedTests || normalizedTests.length === 0) {
                throw new Error('No test results provided for summary generation');
            }

            // Validate tests before processing
            this.validateTestsForSummary(normalizedTests);

            // Create prompt for summary generation
            const prompt = this.createSummaryPrompt(normalizedTests);

            // Use the unified AI service
            const aiResponse = await aiService.generateCompletion(
                this.getSystemPrompt(),
                prompt,
                {
                    temperature: 0.2, // Low temperature for consistent, safe explanations
                    maxTokens: 1500
                }
            );

            const aiResponseContent = aiResponse.content;
            logger.debug('AI summary response:', aiResponseContent);

            // Parse and validate the response
            const summaryData = this.parseSummaryResponse(aiResponseContent);

            // Additional validation to prevent harmful content
            this.validateSummaryContent(summaryData, normalizedTests);

            logger.info('Patient-friendly summary generated successfully');

            return {
                summary: summaryData.summary,
                explanations: summaryData.explanations,
                status: 'ok'
            };

        } catch (error) {
            logger.error('Summary generation failed:', error);
            
            // Return safe fallback
            if (error.message.includes('harmful') || error.message.includes('diagnosis')) {
                return {
                    status: 'unprocessed',
                    reason: 'Unable to generate safe patient explanation'
                };
            }

            // If AI is unavailable, provide basic fallback summary
            if (error.message.includes('disabled') || error.message.includes('unavailable') || 
                error.message.includes('404') || error.message.includes('503')) {
                logger.warn('AI service unavailable, providing basic summary fallback');
                return this.createBasicSummary(normalizedTests);
            }

            throw new Error(`Summary generation failed: ${error.message}`);
        }
    }

    /**
     * Get system prompt for summary generation
     * @returns {string} System prompt with strict safety guidelines
     */
    getSystemPrompt() {
        return `You are a medical communication expert who creates patient-friendly explanations of lab results. Your goal is to help patients understand their test results in simple terms without causing alarm or providing medical diagnoses.

CRITICAL SAFETY RULES:
1. NEVER provide medical diagnoses or treatment recommendations
2. NEVER suggest specific actions like "see a doctor immediately" or "start medication"
3. NEVER interpret results as indicating specific diseases or conditions
4. Use phrases like "may relate to", "could be associated with", "sometimes indicates"
5. Always remind that a healthcare provider should interpret results
6. Focus on general education about what tests measure
7. Avoid alarming language or urgent recommendations
8. If values are critical, simply note they are "outside normal range"

RESPONSE GUIDELINES:
- Use simple, non-technical language (8th grade reading level)
- Explain what each test measures in basic terms
- Describe general reasons why values might be high or low
- Keep explanations educational and reassuring
- Maintain professional but friendly tone
- Always emphasize the need for professional medical interpretation

Response format must be valid JSON:
{
  "summary": "Brief overview of all findings in simple terms",
  "explanations": ["Individual explanation for each abnormal test"]
}

Example good explanations:
- "Low hemoglobin may relate to various factors that affect red blood cells"
- "High glucose levels can occur for many reasons and should be discussed with your healthcare provider"
- "White blood cell counts can vary due to many factors including recent illness"`;
    }

    /**
     * Create summary generation prompt
     * @param {Array<Object>} tests - Normalized test results
     * @returns {string} Formatted prompt
     */
    createSummaryPrompt(tests) {
        const testSummary = tests.map(test => {
            return `${test.name}: ${test.value} ${test.unit} (${test.status.toUpperCase()}) - Normal range: ${test.ref_range.low}-${test.ref_range.high} ${test.unit}`;
        }).join('\n');

        return `Please create a patient-friendly explanation for these lab results. Focus on education and avoid medical diagnoses:

LABORATORY RESULTS:
${testSummary}

Requirements:
- Create a brief summary of overall findings
- Provide individual explanations for any abnormal (high/low/critical) results
- Use simple, reassuring language appropriate for patients
- Focus on general education about what these tests measure
- Avoid specific medical diagnoses or treatment recommendations
- Encourage professional medical consultation for interpretation

Return valid JSON only with summary and explanations array.`;
    }

    /**
     * Parse AI response into structured summary data
     * @param {string} response - AI response
     * @returns {Object} Parsed summary data
     */
    parseSummaryResponse(response) {
        try {
            // Ensure response is a string
            const responseText = typeof response === 'string' ? response : 
                                response?.content || 
                                response?.text || 
                                JSON.stringify(response);
            
            logger.debug('Parsing response text:', responseText);
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error(`No valid JSON found in AI response: ${responseText.substring(0, 200)}...`);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate structure
            if (!parsed.summary || typeof parsed.summary !== 'string') {
                throw new Error('Invalid response: missing or invalid summary');
            }

            if (!parsed.explanations || !Array.isArray(parsed.explanations)) {
                throw new Error('Invalid response: missing or invalid explanations array');
            }

            // Clean and validate content
            parsed.summary = this.cleanSummaryText(parsed.summary);
            parsed.explanations = parsed.explanations.map(exp => this.cleanSummaryText(exp));

            return parsed;

        } catch (error) {
            logger.error('Failed to parse summary response:', error);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Validate tests before summary generation
     * @param {Array<Object>} tests - Test results to validate
     */
    validateTestsForSummary(tests) {
        for (const test of tests) {
            if (!test.name || typeof test.value !== 'number' || !test.unit || !test.status) {
                throw new Error('Invalid test structure for summary generation');
            }

            if (!test.ref_range || typeof test.ref_range.low !== 'number' || typeof test.ref_range.high !== 'number') {
                throw new Error('Invalid reference range for summary generation');
            }
        }
    }

    /**
     * Validate summary content for safety
     * @param {Object} summaryData - Generated summary data
     * @param {Array<Object>} tests - Original test data
     */
    validateSummaryContent(summaryData, tests) {
        // Check for prohibited medical advice
        const prohibitedPhrases = [
            'you have', 'you are diagnosed', 'you need to', 'immediately see',
            'start treatment', 'take medication', 'emergency', 'urgent',
            'serious condition', 'disease', 'illness', 'syndrome',
            'you should stop', 'avoid', 'increase', 'decrease your'
        ];

        const fullText = `${summaryData.summary} ${summaryData.explanations.join(' ')}`.toLowerCase();
        
        for (const phrase of prohibitedPhrases) {
            if (fullText.includes(phrase.toLowerCase())) {
                logger.warn(`Potentially harmful phrase detected: ${phrase}`);
                throw new Error('harmful content detected in summary');
            }
        }

        // Check for diagnosis-related content
        const diagnosisTerms = [
            'diabetes', 'anemia', 'infection', 'cancer', 'leukemia',
            'kidney disease', 'liver disease', 'heart disease', 'thyroid disorder'
        ];

        for (const term of diagnosisTerms) {
            if (fullText.includes(term.toLowerCase()) && 
                !fullText.includes(`may relate to ${term.toLowerCase()}`) &&
                !fullText.includes(`can be associated with ${term.toLowerCase()}`)) {
                logger.warn(`Direct diagnosis reference detected: ${term}`);
            }
        }

        // Validate length and content quality
        if (summaryData.summary.length < 20) {
            throw new Error('Summary too short - insufficient explanation');
        }

        if (summaryData.summary.length > 500) {
            throw new Error('Summary too long - may contain excessive detail');
        }

        // Check that explanations correspond to abnormal tests
        const abnormalTests = tests.filter(test => test.status !== 'normal');
        if (abnormalTests.length > 0 && summaryData.explanations.length === 0) {
            logger.warn('No explanations provided for abnormal test results');
        }
    }

    /**
     * Clean and sanitize summary text
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    cleanSummaryText(text) {
        // Ensure text is a string
        const textString = typeof text === 'string' ? text : 
                          text?.content || 
                          text?.text || 
                          JSON.stringify(text);
                          
        return textString
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
            .replace(/\b(you must|you should immediately|emergency|urgent care)\b/gi, '') // Remove urgent language
            .trim();
    }

    /**
     * Generate educational context for common tests
     * @param {string} testName - Name of the test
     * @returns {string} Educational context
     */
    getTestEducation(testName) {
        const education = {
            'Hemoglobin': 'Hemoglobin is a protein in red blood cells that carries oxygen throughout your body.',
            'WBC': 'White blood cells are part of your immune system and help fight infections.',
            'Glucose': 'Glucose is the main type of sugar in your blood and provides energy to your body.',
            'Cholesterol': 'Cholesterol is a waxy substance your body needs to build cells, but too much can affect heart health.',
            'Creatinine': 'Creatinine is a waste product that your kidneys normally filter from your blood.',
            'Platelets': 'Platelets are small blood cells that help your blood clot when you have an injury.'
        };

        return education[testName] || 'This is a common blood test that helps assess your overall health.';
    }

    /**
     * Create a fallback summary for error cases
     * @param {Array<Object>} tests - Test results
     * @returns {Object} Safe fallback summary
     */
    createFallbackSummary(tests) {
        const abnormalCount = tests.filter(test => test.status !== 'normal').length;
        
        return {
            summary: `Your lab results show ${tests.length} tests were performed. ${abnormalCount > 0 ? 
                `Some values are outside the normal range and should be discussed with your healthcare provider.` : 
                'All values appear to be within normal ranges.'}`,
            explanations: abnormalCount > 0 ? [
                'Some test results are outside normal ranges. Your healthcare provider can help interpret these findings and determine if any follow-up is needed.'
            ] : [],
            status: 'ok'
        };
    }

    /**
     * Create basic summary when AI is unavailable
     * @param {Array} normalizedTests - Normalized test results
     * @returns {Object} Basic summary
     */
    createBasicSummary(normalizedTests) {
        if (!normalizedTests || normalizedTests.length === 0) {
            return {
                status: 'unprocessed',
                reason: 'No test results available for summary'
            };
        }

        const testCount = normalizedTests.length;
        const abnormalTests = normalizedTests.filter(test => 
            test.status === 'high' || test.status === 'low' || test.status === 'critical'
        );

        let basicSummary = `Your lab report contains ${testCount} test result${testCount > 1 ? 's' : ''}.`;
        
        if (abnormalTests.length === 0) {
            basicSummary += ' All test values appear to be within normal ranges.';
        } else {
            basicSummary += ` ${abnormalTests.length} test${abnormalTests.length > 1 ? 's' : ''} show values outside normal ranges.`;
        }

        basicSummary += ' Please discuss these results with your healthcare provider for proper interpretation.';

        // Create basic explanations for each test
        const explanations = normalizedTests.map(test => {
            let explanation = `${test.name}: ${test.value} ${test.unit}`;
            
            if (test.status === 'normal') {
                explanation += ' - This value is within the normal range.';
            } else if (test.status === 'high') {
                explanation += ' - This value is above the normal range.';
            } else if (test.status === 'low') {
                explanation += ' - This value is below the normal range.';
            } else if (test.status === 'critical') {
                explanation += ' - This value requires medical attention.';
            }
            
            return explanation;
        });

        return {
            summary: basicSummary,
            explanations: explanations,
            status: 'ok'
        };
    }
}

module.exports = new SummaryService();