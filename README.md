# 🏥 AI-Powered Medical Report Simplifier

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

## � API Usage

### Primary Endpoint
```bash
POST /api/medical-reports/process
```

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
  "status": "ok"
}
```

## 🏗️ Architecture

```
Input → OCR/Parse → AI Normalize → AI Summary → JSON Output
 │         │           │             │           │
 │    Tesseract.js  Google AI    Google AI    Schema
 └─── Text/Image ────────────────────────────────────┘
```

**Tech Stack**: Node.js, Express, Google Gemini AI, Tesseract.js OCR

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

## 📁 Project Structure

```
src/
├── services/           # Core business logic (AI, OCR, normalization)
├── controllers/        # API request handlers
├── middleware/         # Validation, security, uploads
└── routes/            # API endpoints
public/                # Frontend demo interface
server.js              # Main application entry point
```

**Perfect for technical interviews - demonstrates full-stack AI integration! 🎯**