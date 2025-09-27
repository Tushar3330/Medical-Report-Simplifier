const fetch = require('node-fetch');

async function testGeminiDirect() {
    console.log('🧪 Testing Gemini API directly...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
        console.log('❌ No Gemini API key configured');
        return;
    }
    
    console.log('✅ API key present');
    console.log('🔑 Key format:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 5));
    
    try {
        // Try to list models using direct API call
        console.log('📋 Listing models via direct API...');
        
        const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const response = await fetch(listUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ API Response received');
        
        if (data.models && data.models.length > 0) {
            console.log('📋 Available models:');
            data.models.forEach(model => {
                console.log(`  - ${model.name}`);
                if (model.supportedGenerationMethods) {
                    console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
                }
            });
            
            // Find a suitable model for text generation
            const textModel = data.models.find(m => 
                m.supportedGenerationMethods && 
                m.supportedGenerationMethods.includes('generateContent')
            );
            
            if (textModel) {
                console.log(`\n✅ Recommended model: ${textModel.name}`);
                return textModel.name;
            }
        } else {
            console.log('❌ No models found in response');
        }
        
    } catch (error) {
        console.error('❌ Direct API Error:', error.message);
        
        // Check common issues
        if (error.message.includes('403')) {
            console.log('💡 API key might be invalid or restricted');
            console.log('💡 Check: https://makersuite.google.com/app/apikey');
        } else if (error.message.includes('404')) {
            console.log('💡 API endpoint might have changed');
        }
    }
}

// Load environment variables
require('dotenv').config();

testGeminiDirect();