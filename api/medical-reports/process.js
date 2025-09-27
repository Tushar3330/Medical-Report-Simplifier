// Medical reports processing endpoint for Vercel
const multer = require('multer');
const { processReport } = require('../../src/controllers/medicalReportController');
const { validateRequest } = require('../../src/middleware/validation');

// Configure multer for memory storage (Vercel compatible)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle file upload
    const uploadMiddleware = upload.single('image');
    
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Validate request
    const validationResult = validateRequest(req, res, () => {});
    if (!validationResult) {
      return; // Response already sent by validation middleware
    }

    // Process the report
    await processReport(req, res);
    
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Processing failed',
      message: error.message || 'Internal server error'
    });
  }
};