const express = require('express');
const router = express.Router();

const medicalReportController = require('../controllers/medicalReportController');
const upload = require('../middleware/upload');
const { 
    validateProcessReport, 
    validateTextInput, 
    validateNormalizeTests 
} = require('../middleware/validation');

// Main processing endpoint - handles both text and image
router.post('/process', 
    upload.single('image'), // Handle file upload
    medicalReportController.validateFileUpload,
    validateProcessReport,
    medicalReportController.processReport
);

// Step 1: Extract test data from text or image
router.post('/extract',
    upload.single('image'),
    medicalReportController.validateFileUpload,
    validateProcessReport,
    medicalReportController.extractTests
);

// Step 2: Normalize extracted test data
router.post('/normalize',
    validateNormalizeTests,
    medicalReportController.normalizeTests
);

// Step 3: Generate patient-friendly summary
router.post('/summarize',
    medicalReportController.generateSummary
);

// Debug endpoint: Process step by step
router.post('/debug',
    validateNormalizeTests,
    medicalReportController.processStepByStep
);

// Service information endpoint
router.get('/info',
    medicalReportController.getServiceInfo
);

// Health check endpoints
router.get('/health', medicalReportController.healthCheck);
router.get('/health/ai', medicalReportController.aiHealthCheck);
router.get('/provider-info', medicalReportController.getProviderInfo);

// Debug endpoint for testing (no validation)
router.post('/test-process', (req, res) => {
    console.log('Test endpoint - Body received:', JSON.stringify(req.body, null, 2));
    res.json({
        status: 'debug',
        body_received: req.body,
        body_type: typeof req.body,
        keys: Object.keys(req.body || {})
    });
});

module.exports = router;