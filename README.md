# 🏥 AI-Powered Medical Repor✅ **Interview-Ready Demo**: Complete UI for non-technical stakeholders  

## 🖥️ Frontend Interface

**Access**: http://localhost:3000  
**Features**: Drag-and-drop file upload, real-time processing, formatted results display

*Note: Though this was a backend assignment, I built a complete frontend to demonstrate the API in action and make it interview-friendly for non-technical stakeholders.*

## 📡 Complete API Referenceimplifier

**SDE Intern Assignment - Problem Statement 7**  
*AI-powered medical report processing with OCR, normalization, and patient-friendly explanations*

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/Tushar3330/Medical-Report-Simplifier
cd medical-report-simplifier
npm install

# Configure (get API key from: https://makersuite.google.com/app/apikey)
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start server
npm start
```

**Demo**: http://localhost:3000 | **API**: http://localhost:3000/api/medical-reports/process

## 🎯 Core Features

✅ **4-Step Processing Pipeline**: OCR → Normalize → Explain → Output  
✅ **Text & Image Support**: Handles typed reports and scanned documents  
✅ **Hallucination Prevention**: AI validation against original input  
✅ **Patient-Safe Output**: No diagnoses, only explanations  
✅ **Full-Stack Solution**: Backend API + Frontend Interface (beyond requirements!)  
✅ **Interview-Ready Demo**: Complete UI for non-technical stakeholders  

## � API Usage

### Main Processing Endpoint
```bash
POST /api/medical-reports/process  # Main endpoint for all processing
```

### Step-by-Step Endpoints (for debugging/development)
```bash
POST /api/medical-reports/extract     # Step 1: OCR/Text extraction only
POST /api/medical-reports/normalize   # Step 2: Test normalization only  
POST /api/medical-reports/summarize   # Step 3: Patient summary only
POST /api/medical-reports/debug       # Complete step-by-step processing
```

### Health & Monitoring Endpoints
```bash
GET  /health                          # Server health check
GET  /api/medical-reports/health      # Service health check
GET  /api/medical-reports/health/ai   # AI service connectivity
GET  /api/medical-reports/info        # API version and capabilities
```

### Usage Examples

**Text Input:**
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"}'
```

**Image Input:**
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -F "image=@medical-report.jpg"
```

**Step-by-Step Processing (for debugging):**
```bash
# Step 1: Extract raw text/OCR
curl -X POST http://localhost:3000/api/medical-reports/extract \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "text": "Hemoglobin 10.2 g/dL (Low)"}'

# Step 2: Normalize extracted tests
curl -X POST http://localhost:3000/api/medical-reports/normalize \
  -H "Content-Type: application/json" \
  -d '{"tests_raw": ["Hemoglobin 10.2 g/dL (Low)"]}'

# Step 3: Generate patient summary
curl -X POST http://localhost:3000/api/medical-reports/summarize \
  -H "Content-Type: application/json" \
  -d '{"tests": [{"name": "Hemoglobin", "value": 10.2, "status": "low"}]}'
```

**Response Format:**
```json
{
  "tests": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL", 
      "status": "low",
      "ref_range": {"low": 12.0, "high": 15.0}
    }
  ],
  "summary": "Low hemoglobin detected in your results.",
  "explanations": ["Low hemoglobin may indicate anemia or blood loss."],
  "status": "ok",
  "processing_metadata": {
    "extraction_confidence": 0.95,
    "normalization_confidence": 0.84,
    "tests_processed": 1,
    "processing_id": "unique_id",
    "timestamp": "2025-09-27T10:30:00.000Z"
  }
}
```

## 🏗️ Complete Architecture

### Frontend + Backend Solution
```
┌─────────────────┐    ┌─────────────────────────────────────────┐
│   Frontend UI   │    │              Backend API                │
│   (public/)     │    │                                         │
│  ┌───────────┐  │    │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────────┐ │
│  │HTML/CSS/JS│──┼────┼→│ API │→│ OCR │→│ AI  │→│ JSON Output │ │
│  │File Upload│  │    │ │Layer│ │     │ │     │ │             │ │
│  └───────────┘  │    │ └─────┘ └─────┘ └─────┘ └─────────────┘ │
└─────────────────┘    │    │       │       │           │       │
                       │ Express  Tesseract Gemini   Validation │
                       │          .js      AI        + Schema   │
                       └─────────────────────────────────────────┘
```

### 4-Step Processing Pipeline
```
Step 1: OCR/Text Extraction → Step 2: Test Normalization → 
Step 3: Patient Summary → Step 4: Final JSON Assembly
```

**Tech Stack**: 
- **Backend**: Node.js, Express, Google Gemini AI, Tesseract.js OCR
- **Frontend**: Vanilla HTML/CSS/JavaScript (intentionally simple for demos)
- **Security**: Helmet, CORS, Joi validation, Multer file handling

## 🧪 Testing Examples

```bash
# Health check
curl http://localhost:3000/health

# Normal values
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"text","text":"Hemoglobin: 14.5 g/dL"}' \
  http://localhost:3000/api/medical-reports/process

# Multiple abnormal values
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"text","text":"CBC: Hemoglobin 8.5 g/dL (Low), WBC 15,200 /uL (High)"}' \
  http://localhost:3000/api/medical-reports/process

# Error handling
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"text","text":"No medical data"}' \
  http://localhost:3000/api/medical-reports/process
```

## 🛡️ Production Features

- **Guardrails**: Prevents hallucinated test results not in original input
- **Security**: CORS, Helmet, input validation, file size limits  
- **Error Handling**: Comprehensive validation and recovery mechanisms
- **Logging**: Detailed processing logs for debugging and monitoring

## 📁 Detailed Project Structure

```
medical-report-simplifier/
├── 📄 server.js                      # Main Express application entry point
├── 📄 package.json                   # Dependencies and scripts
├── 📄 .env                           # Environment configuration
├── 📁 src/                           # Backend source code
│   ├── 📁 services/                  # Core business logic
│   │   ├── aiService.js              # Google Gemini AI integration
│   │   ├── ocrService.js             # Tesseract.js OCR processing
│   │   ├── normalizationService.js   # Test standardization logic
│   │   ├── summaryService.js         # Patient-friendly explanations
│   │   └── medicalReportService.js   # Main orchestration service
│   ├── 📁 controllers/               # API request handlers
│   │   └── medicalReportController.js
│   ├── 📁 middleware/                # Express middleware
│   │   ├── errorHandler.js           # Global error handling
│   │   ├── validation.js             # Input validation (Joi)
│   │   └── upload.js                 # File upload handling (Multer)
│   ├── 📁 routes/                    # API route definitions
│   │   └── medicalReports.js
│   ├── 📁 config/                    # Configuration management
│   │   └── config.js
│   └── 📁 utils/                     # Utility functions
│       ├── logger.js                 # Winston logging
│       └── apiHealthChecker.js       # Health monitoring
├── 📁 public/                        # Frontend interface
│   ├── index.html                    # Main UI (drag-drop, results display)
│   └── app.js                        # Frontend JavaScript
├── 📁 uploads/                       # Temporary file storage
├── 📁 logs/                          # Application logs
│   ├── combined.log                  # All logs
│   └── error.log                     # Error logs only
└── 📁 samples/                       # Test data and examples
    ├── sample-report-1.txt
    ├── sample-ocr-text.txt
    └── Medical-Report-Simplifier.postman_collection.json
```

