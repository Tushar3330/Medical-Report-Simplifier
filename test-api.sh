#!/bin/bash

# Medical Report Simplifier API Test Script
echo "🏥 Testing Medical Report Simplifier API"
echo "========================================"

BASE_URL="http://localhost:3000"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${BLUE}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o response.tmp -w "%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -X POST -H "Content-Type: application/json" \
                   -d "$data" -o response.tmp -w "%{http_code}" "$BASE_URL$endpoint")
    fi
    
    if [ "$response" -eq 200 ] || [ "$response" -eq 422 ]; then
        echo -e "${GREEN}✓ Success (HTTP $response)${NC}"
        echo "Response:"
        cat response.tmp | jq '.' 2>/dev/null || cat response.tmp
    else
        echo -e "${RED}✗ Failed (HTTP $response)${NC}"
        cat response.tmp
    fi
    echo ""
    rm -f response.tmp
}

# Check if server is running
echo "Checking if server is running..."
if curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start it with 'npm run dev'${NC}"
    exit 1
fi
echo ""

# Test 1: Health Check
test_endpoint "GET" "/health" "" "Health Check"

# Test 2: Service Info
test_endpoint "GET" "/api/medical-reports/info" "" "Service Information"

# Test 3: Simple Text Processing
simple_text='{
  "type": "text",
  "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)"
}'
test_endpoint "POST" "/api/medical-reports/process" "$simple_text" "Simple Text Processing"

# Test 4: Extract Tests Only
test_endpoint "POST" "/api/medical-reports/extract" "$simple_text" "Extract Tests Only (Step 1)"

# Test 5: Normalize Tests
normalize_data='{
  "tests_raw": [
    "Hemoglobin 10.2 g/dL (Low)",
    "WBC 11200 /uL (High)"
  ],
  "confidence": 0.80
}'
test_endpoint "POST" "/api/medical-reports/normalize" "$normalize_data" "Normalize Tests (Step 2)"

# Test 6: Generate Summary
summary_data='{
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
      "unit": "/uL",
      "status": "high",
      "ref_range": {"low": 4000, "high": 11000}
    }
  ]
}'
test_endpoint "POST" "/api/medical-reports/summarize" "$summary_data" "Generate Summary (Step 3)"

# Test 7: Complex Medical Report
complex_text='{
  "type": "text",
  "text": "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High), RBC 4.2 million/uL (Normal), Platelets 250,000 /uL (Normal)\n\nBASIC METABOLIC PANEL:\nGlucose: 145 mg/dL (High)\nCreatinine: 1.1 mg/dL (Normal)\nBUN: 18 mg/dL (Normal)\nSodium: 140 mmol/L (Normal)\n\nLIPID PROFILE:\nTotal Cholesterol: 220 mg/dL (High)\nLDL Cholesterol: 150 mg/dL (High)\nHDL Cholesterol: 35 mg/dL (Low)\nTriglycerides: 180 mg/dL (Normal)"
}'
test_endpoint "POST" "/api/medical-reports/process" "$complex_text" "Complex Medical Report"

# Test 8: Debug Step-by-Step
test_endpoint "POST" "/api/medical-reports/debug" "$normalize_data" "Debug Step-by-Step Processing"

# Test 9: Error Cases
echo -e "${BLUE}Testing Error Cases${NC}"

# Empty text
empty_text='{"type": "text", "text": ""}'
test_endpoint "POST" "/api/medical-reports/process" "$empty_text" "Empty Text (Should Fail)"

# Invalid data
invalid_data='{"invalid": "data"}'
test_endpoint "POST" "/api/medical-reports/normalize" "$invalid_data" "Invalid Data (Should Fail)"

echo "🏁 Testing completed!"
echo ""
echo "To test image upload, use:"
echo "curl -X POST -F 'image=@/path/to/your/medical-report.jpg' $BASE_URL/api/medical-reports/process"