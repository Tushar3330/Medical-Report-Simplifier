#!/bin/bash

echo "🧪 Testing AI-Powered Medical Report Simplifier"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}📡 Checking server health...${NC}"
curl -s http://localhost:3000/health > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server not running. Start with: npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Step 1: OCR/Text Extraction${NC}"
echo "Input: CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
echo "Expected: tests_raw array with confidence"

curl -X POST http://localhost:3000/api/medical-reports/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"}' \
  -s | jq .

echo ""
echo -e "${BLUE}⚙️ Step 2: Test Normalization${NC}"
echo "Input: Raw tests array"
echo "Expected: Normalized tests with ref_range and status"

curl -X POST http://localhost:3000/api/medical-reports/normalize \
  -H "Content-Type: application/json" \
  -d '{"tests_raw": ["Hemoglobin 10.2 g/dL (Low)", "WBC 11200 /uL (High)"], "confidence": 0.80}' \
  -s | jq .

echo ""
echo -e "${BLUE}📋 Step 3: Patient Summary${NC}"
echo "Input: Normalized tests"
echo "Expected: Patient-friendly summary and explanations"

curl -X POST http://localhost:3000/api/medical-reports/summarize \
  -H "Content-Type: application/json" \
  -d '{"tests": [{"name":"Hemoglobin","value":10.2,"unit":"g/dL","status":"low","ref_range":{"low":12.0,"high":15.0}},{"name":"WBC","value":11200,"unit":"/uL","status":"high","ref_range":{"low":4000,"high":11000}}]}' \
  -s | jq .

echo ""
echo -e "${BLUE}🎯 Step 4: Complete Pipeline${NC}"
echo "Input: Raw medical text"
echo "Expected: Complete output with tests, summary, and status"

curl -X POST http://localhost:3000/api/medical-reports/process \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"}' \
  -s | jq .

echo ""
echo -e "${GREEN}✅ All steps tested! Compare outputs with problem statement requirements.${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend Demo: http://localhost:3000${NC}"
echo -e "${BLUE}📖 Try the web interface for full user experience${NC}"