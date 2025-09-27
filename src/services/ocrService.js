const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class OCRService {
    constructor() {
        this.confidenceThreshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.5;
    }

    /**
     * Extract text from image using OCR
     * @param {string} imagePath - Path to the image file
     * @returns {Promise<Object>} Extracted text with confidence score
     */
    async extractFromImage(imagePath) {
        try {
            logger.info(`Starting OCR extraction for image: ${imagePath}`);

            // Preprocess image for better OCR results
            const processedImagePath = await this.preprocessImage(imagePath);

            // Perform OCR
            const { data } = await Tesseract.recognize(processedImagePath, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });

            // Clean up processed image if it's different from original
            if (processedImagePath !== imagePath) {
                fs.unlinkSync(processedImagePath);
            }

            // Clean up original uploaded file
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }

            const extractedText = data.text.trim();
            const confidence = data.confidence / 100; // Convert to 0-1 scale

            logger.info(`OCR completed with confidence: ${confidence.toFixed(2)}`);

            if (confidence < this.confidenceThreshold) {
                logger.warn(`Low OCR confidence: ${confidence.toFixed(2)}, threshold: ${this.confidenceThreshold}`);
            }

            // Extract medical test data
            const testsRaw = this.extractMedicalTests(extractedText);

            return {
                tests_raw: testsRaw,
                confidence: Math.round(confidence * 100) / 100,
                raw_text: extractedText
            };

        } catch (error) {
            logger.error('OCR extraction failed:', error);
            throw new Error(`OCR processing failed: ${error.message}`);
        }
    }

    /**
     * Extract medical tests from text input
     * @param {string} text - Input text (from OCR or direct input)
     * @returns {Promise<Object>} Extracted tests with confidence
     */
    async extractFromText(text) {
        try {
            logger.info('Extracting medical tests from text input');

            // Clean and normalize the text
            const cleanedText = this.cleanText(text);
            
            // Extract medical test data
            const testsRaw = this.extractMedicalTests(cleanedText);

            // Calculate confidence based on text quality and pattern matching
            const confidence = this.calculateTextConfidence(cleanedText, testsRaw);

            logger.info(`Text extraction completed with confidence: ${confidence.toFixed(2)}`);

            return {
                tests_raw: testsRaw,
                confidence: Math.round(confidence * 100) / 100,
                raw_text: cleanedText
            };

        } catch (error) {
            logger.error('Text extraction failed:', error);
            throw new Error(`Text processing failed: ${error.message}`);
        }
    }

    /**
     * Preprocess image to improve OCR accuracy
     * @param {string} imagePath - Original image path
     * @returns {Promise<string>} Processed image path
     */
    async preprocessImage(imagePath) {
        try {
            logger.info('Using original image - preprocessing disabled');
            return imagePath;

        } catch (error) {
            logger.warn(`Image preprocessing failed, using original: ${error.message}`);
            return imagePath;
        }
    }

    /**
     * Clean and normalize text
     * @param {string} text - Raw text input
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters
            .trim();
    }

    /**
     * Extract medical test data from text using pattern matching
     * @param {string} text - Cleaned text input
     * @returns {Array<string>} Array of extracted test results
     */
    extractMedicalTests(text) {
        const testsRaw = [];
        
        // Common medical test patterns
        const patterns = [
            // Pattern: Test Name Value Unit (Status)
            /([A-Za-z][A-Za-z\s]+?)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\μ]+(?:\/[a-zA-Z]+)?)\s*\(?([Ll]ow|[Hh]igh|[Nn]ormal|[Aa]bnormal)?\)?/g,
            
            // Pattern: Test: Value Unit Status
            /([A-Za-z][A-Za-z\s]+?):\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\μ]+)\s*\(?([Ll]ow|[Hh]igh|[Nn]ormal|[Aa]bnormal)?\)?/g,
            
            // Pattern for CBC, WBC, RBC common formats
            /([A-Za-z]{2,})\s*(\d+(?:\.\d+)?)\s*([a-zA-Z\/\%\μ]+)\s*\(?([Ll]ow|[Hh]igh|[Nn]ormal)?\)?/g
        ];

        // Fix common OCR errors
        const correctedText = this.fixCommonOCRErrors(text);

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(correctedText)) !== null) {
                const testName = match[1].trim();
                const value = match[2];
                const unit = match[3];
                const status = match[4] || '';

                // Filter out unlikely test names
                if (this.isValidTestName(testName)) {
                    const testResult = `${testName} ${value} ${unit}${status ? ` (${status})` : ''}`;
                    if (!testsRaw.includes(testResult)) {
                        testsRaw.push(testResult);
                    }
                }
            }
        });

        // Fallback: Look for lines that might contain test results
        if (testsRaw.length === 0) {
            const lines = correctedText.split('\n');
            lines.forEach(line => {
                line = line.trim();
                if (line.length > 5 && 
                    /\d/.test(line) && 
                    /[a-zA-Z]/.test(line) && 
                    !/(date|name|patient|doctor|address|phone|report)/i.test(line)) {
                    testsRaw.push(line);
                }
            });
        }

        return testsRaw.slice(0, 20); // Limit to 20 tests to prevent abuse
    }

    /**
     * Fix common OCR recognition errors
     * @param {string} text - Original text
     * @returns {string} Text with common errors fixed
     */
    fixCommonOCRErrors(text) {
        const corrections = {
            'Hemglobin': 'Hemoglobin',
            'Haemoglobin': 'Hemoglobin',
            'Hgb': 'Hemoglobin',
            'Hgh': 'High',
            'Hlgh': 'High',
            'Norrnal': 'Normal',
            'Normai': 'Normal',
            '/uL': '/μL',
            'g/dL': 'g/dL',
            'mg/dL': 'mg/dL',
            'WBC': 'WBC',
            'RBC': 'RBC',
            'CBC': 'CBC'
        };

        let correctedText = text;
        Object.entries(corrections).forEach(([error, correction]) => {
            const regex = new RegExp(error, 'gi');
            correctedText = correctedText.replace(regex, correction);
        });

        return correctedText;
    }

    /**
     * Check if extracted name is a valid medical test name
     * @param {string} testName - Extracted test name
     * @returns {boolean} Whether the name is valid
     */
    isValidTestName(testName) {
        // Common medical test names and abbreviations
        const validTests = [
            'hemoglobin', 'hgb', 'wbc', 'rbc', 'platelets', 'glucose', 
            'cholesterol', 'triglycerides', 'ldl', 'hdl', 'creatinine',
            'bun', 'sodium', 'potassium', 'chloride', 'co2', 'protein',
            'albumin', 'bilirubin', 'alt', 'ast', 'alkaline phosphatase',
            'hematocrit', 'hct', 'mcv', 'mch', 'mchc', 'neutrophils',
            'lymphocytes', 'monocytes', 'eosinophils', 'basophils',
            'white blood cell', 'red blood cell', 'complete blood count',
            'cbc', 'blood urea nitrogen', 'thyroid', 'tsh', 't3', 't4'
        ];

        const normalizedName = testName.toLowerCase().trim();
        
        // Check against known test names
        const isKnownTest = validTests.some(test => 
            normalizedName.includes(test) || test.includes(normalizedName)
        );

        // Additional validation rules
        const hasValidLength = testName.length >= 2 && testName.length <= 50;
        const hasLetters = /[a-zA-Z]/.test(testName);
        const notCommonWords = !/(the|and|or|but|for|date|time|page|report)/i.test(testName);

        return isKnownTest && hasValidLength && hasLetters && notCommonWords;
    }

    /**
     * Calculate confidence score for text extraction
     * @param {string} text - Input text
     * @param {Array} testsRaw - Extracted tests
     * @returns {number} Confidence score (0-1)
     */
    calculateTextConfidence(text, testsRaw) {
        let confidence = 0.5; // Base confidence

        // Factor 1: Number of tests found
        if (testsRaw.length > 0) confidence += 0.2;
        if (testsRaw.length > 2) confidence += 0.1;

        // Factor 2: Medical terminology present
        const medicalTerms = ['hemoglobin', 'wbc', 'glucose', 'cholesterol', 'creatinine', 'cbc'];
        const foundTerms = medicalTerms.filter(term => 
            text.toLowerCase().includes(term)
        ).length;
        confidence += Math.min(foundTerms * 0.05, 0.15);

        // Factor 3: Proper formatting (units, numbers)
        if (/\d+\.\d+/.test(text)) confidence += 0.05; // Decimal numbers
        if (/g\/dL|mg\/dL|\/μL|%/.test(text)) confidence += 0.1; // Medical units

        // Factor 4: Penalize if too short or too long
        if (text.length < 20) confidence -= 0.2;
        if (text.length > 2000) confidence -= 0.1;

        return Math.min(Math.max(confidence, 0), 1);
    }
}

module.exports = new OCRService();