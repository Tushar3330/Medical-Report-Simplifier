#!/bin/bash

# Medical Report Simplifier - Gemini Setup Guide
echo "🚀 Medical Report Simplifier - Google Gemini Integration"
echo "======================================================"
echo

echo "📋 To switch from OpenAI to Google Gemini (FREE!):"
echo
echo "1. Get your FREE Gemini API key:"
echo "   📖 Visit: https://makersuite.google.com/app/apikey"
echo "   📝 Sign in with Google account"
echo "   🔑 Click 'Create API Key'"
echo "   📋 Copy the API key"
echo

echo "2. Update your .env file:"
echo "   📝 Open: .env"
echo "   🔄 Set: AI_PROVIDER=gemini"
echo "   🔑 Set: GEMINI_API_KEY=your-actual-api-key-here"
echo

echo "3. Restart the server:"
echo "   🔄 Run: node server.js"
echo

echo "📊 Current Configuration Status:"

# Check current provider
if grep -q "AI_PROVIDER=gemini" .env; then
    echo "   ✅ Provider set to Gemini"
else
    echo "   ⚠️  Provider not set to Gemini"
fi

# Check API keys
if grep -q "GEMINI_API_KEY=your-gemini-api-key-here" .env; then
    echo "   ❌ Gemini API key not configured"
else
    echo "   ✅ Gemini API key configured"
fi

if grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "   ⚠️  OpenAI API key present (has quota issues)"
else
    echo "   ℹ️  OpenAI API key not found"
fi

echo
echo "🎯 Why Gemini?"
echo "   ✅ FREE tier with generous limits"
echo "   ✅ No credit card required to start"
echo "   ✅ Same medical processing capabilities"
echo "   ✅ Google's latest AI technology"
echo

echo "🔗 Useful Links:"
echo "   📖 Gemini API Docs: https://ai.google.dev/"
echo "   🔑 Get API Key: https://makersuite.google.com/app/apikey"
echo "   🏥 Test Frontend: http://localhost:3000"
echo

echo "⚡ Quick Commands:"
echo "   Check AI Health: curl http://localhost:3000/api/medical-reports/health/ai"
echo "   Provider Info:   curl http://localhost:3000/api/medical-reports/provider-info"
echo