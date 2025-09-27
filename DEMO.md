# Medical Report Simplifier - Setup and Demo Guide

## 🚀 Quick Demo Setup

### Step 1: Environment Setup
1. Copy the `.env.example` file to `.env`
2. Add your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env and add: OPENAI_API_KEY=your_actual_api_key_here
   ```

### Step 2: Install and Start
```bash
npm install
npm run dev
```

### Step 3: Test the API
```bash
# Quick health check
curl http://localhost:3000/health

# Run comprehensive tests
./test-api.sh
```

## 📱 Demo Scenarios

### Scenario 1: Simple Blood Test (Text Input)
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
  }'
```

**Expected Output:**
```json
{
  "tests": [
    {
      "name": "Hemoglobin",
      "value": 10.2,
      "unit": "g/dL",
      "status": "low",
      "ref_range": {"low": 12.0, "high": 15.0}
    },
    {
      "name": "WBC",
      "value": 11200,
      "unit": "/μL",
      "status": "high",
      "ref_range": {"low": 4000, "high": 11000}
    }
  ],
  "summary": "Low hemoglobin and high white blood cell count.",
  "explanations": [
    "Low hemoglobin may relate to various factors that affect red blood cells.",
    "High white blood cell count can occur with infections or other conditions."
  ],
  "status": "ok"
}
```

### Scenario 2: OCR Simulation (Typos)
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "text": "CBC: Hemglobin 10.2 g/dL (Low) WBC 11200 /uL (Hgh)"
  }'
```
*The system automatically corrects "Hemglobin" → "Hemoglobin" and "Hgh" → "High"*

### Scenario 3: Complex Medical Report
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d @samples/sample-report-1.txt
```

### Scenario 4: Image Upload (If you have a medical report image)
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -F 'image=@/path/to/your/medical-report.jpg'
```

## 🔬 Step-by-Step Processing Demo

### Step 1: Extract Tests
```bash
curl -X POST http://localhost:3000/api/medical-reports/extract \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
  }'
```

### Step 2: Normalize (using output from Step 1)
```bash
curl -X POST http://localhost:3000/api/medical-reports/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "tests_raw": [
      "Hemoglobin 10.2 g/dL (Low)",
      "WBC 11200 /uL (High)"
    ],
    "confidence": 0.80
  }'
```

### Step 3: Generate Summary (using output from Step 2)
```bash
curl -X POST http://localhost:3000/api/medical-reports/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "tests": [
      {
        "name": "Hemoglobin",
        "value": 10.2,
        "unit": "g/dL",
        "status": "low",
        "ref_range": {"low": 12.0, "high": 15.0}
      },
      {
        "name": "WBC", 
        "value": 11200,
        "unit": "/μL",
        "status": "high",
        "ref_range": {"low": 4000, "high": 11000}
      }
    ]
  }'
```

## 🛡️ Safety Guardrails Demo

### Hallucination Prevention
Try this request (should fail safely):
```bash
curl -X POST http://localhost:3000/api/medical-reports/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "tests_raw": ["Simple text without medical data"],
    "confidence": 0.80
  }'
```

**Expected Response:**
```json
{
  "status": "unprocessed",
  "reason": "hallucinated tests not present in input"
}
```

### Invalid Input Handling
```bash
curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "text": ""
  }'
```

**Expected Response:**
```json
{
  "status": "error",
  "message": "Text must be at least 10 characters long",
  "field": "text"
}
```

## 🌐 Cloud Demo with ngrok

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start your server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Use the HTTPS URL for testing:**
   ```bash
   curl -X POST https://your-ngrok-url.ngrok.io/api/medical-reports/process \
     -H "Content-Type: application/json" \
     -d '{
       "type": "text",
       "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
     }'
   ```

## 📊 Postman Demo

1. Import `samples/Medical-Report-Simplifier.postman_collection.json`
2. Set the `baseUrl` variable to your server URL
3. Run the collection to test all endpoints

## 🎬 Screen Recording Scenarios

### Scenario A: Basic Functionality (2-3 minutes)
1. Show server startup (`npm run dev`)
2. Demonstrate health check (`/health`)
3. Process simple medical text
4. Show step-by-step processing
5. Demonstrate error handling

### Scenario B: Advanced Features (3-4 minutes)  
1. Process complex medical report
2. Show OCR error correction
3. Demonstrate safety guardrails
4. Process image upload (if available)
5. Show service information endpoint

### Scenario C: Production Readiness (2-3 minutes)
1. Show logging output
2. Demonstrate error handling
3. Show API documentation structure
4. Highlight security features
5. Show monitoring endpoints

## 🔧 Troubleshooting Demo Issues

### If OpenAI API fails:
- The system will return appropriate error messages
- Logs will show the specific issue
- Fallback responses are provided where possible

### If OCR processing fails:
- Ensure image is clear and contains readable text
- Check file size (must be under 10MB)
- Verify image format is supported

### If tests don't pass:
- Check that OpenAI API key is set correctly
- Ensure server is running on the expected port
- Verify all dependencies are installed

## 📈 Performance Monitoring

Monitor these metrics during demo:
- Response times (should be 2-15 seconds depending on complexity)
- Confidence scores (should be above 0.5 for good results)
- Error rates (should be low with proper input)
- Memory usage (stable with file cleanup)

## 🎯 Demo Tips

1. **Start Simple**: Begin with basic text input before complex scenarios
2. **Show Safety**: Demonstrate guardrails and error handling
3. **Explain Architecture**: Walk through the 4-step processing pipeline
4. **Highlight Production Features**: Security, logging, validation, monitoring
5. **Show Scalability**: Mention stateless design and cloud deployment options