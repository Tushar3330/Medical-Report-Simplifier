// Medical reports info endpoint for Vercel
module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  res.json({
    service: 'Medical Report Simplifier',
    version: '1.0.0',
    endpoints: {
      process: 'POST /api/medical-reports/process',
      info: 'GET /api/medical-reports/info'
    },
    supportedFormats: [
      'Plain text reports',
      'Image files (JPG, PNG, GIF, BMP, TIFF)'
    ],
    maxFileSize: '10MB',
    features: [
      'OCR text extraction',
      'Medical test normalization',
      'Patient-friendly summaries',
      'AI-powered analysis'
    ]
  });
};