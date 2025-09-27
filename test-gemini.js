const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    console.log('🧪 Testing Gemini API Connection...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
        console.log('❌ No Gemini API key configured');
        return;
    }
    
    console.log('✅ API key present');
    
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Test with common model names
        const modelsToTry = [
            'gemini-pro',
            'gemini-1.0-pro',
            'gemini-1.5-pro',
            'gemini-1.5-flash',
            'models/gemini-pro',
            'models/gemini-1.0-pro'
        ];
        
        for (const modelName of modelsToTry) {
            try {
                console.log(`\n🚀 Testing model: ${modelName}`);
                
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent('Say "Hello, API test successful!"');
                const response = await result.response;
                const text = response.text();
                
                console.log('✅ Success! Response:', text);
                console.log(`✅ Working model found: ${modelName}`);
                break;
                
            } catch (modelError) {
                console.log(`❌ ${modelName}: ${modelError.message.split('\n')[0]}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Common error scenarios
        if (error.message.includes('API_KEY_INVALID')) {
            console.log('💡 Solution: Check your API key at https://makersuite.google.com/app/apikey');
        } else if (error.message.includes('PERMISSION_DENIED')) {
            console.log('💡 Solution: Make sure the API key has proper permissions');
        } else if (error.message.includes('404')) {
            console.log('💡 Solution: Try a different model name');
        }
    }
}

// Load environment variables
require('dotenv').config();

testGemini();