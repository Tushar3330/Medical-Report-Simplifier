const OpenAI = require('openai');
const logger = require('./logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const PREFERRED_MODELS = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];
const FALLBACK_MODEL = 'gpt-3.5-turbo';

/**
 * Check OpenAI API health and model availability
 */
async function checkOpenAIHealth() {
    try {
        logger.info('Checking OpenAI API health...');

        // Test API connection with a simple completion
        const testPrompt = "Say 'API test successful' if you can read this.";
        
        const response = await openai.chat.completions.create({
            model: FALLBACK_MODEL,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 10,
            temperature: 0
        });

        const success = response.choices && response.choices.length > 0;
        
        logger.info('OpenAI API test result:', { success });
        
        return {
            status: success ? 'healthy' : 'unhealthy',
            model_tested: FALLBACK_MODEL,
            response_received: success,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('OpenAI API health check failed:', error);
        
        return {
            status: 'unhealthy',
            error: error.message,
            error_code: error.code || 'unknown',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Test a specific model
 */
async function testModel(modelName) {
    try {
        const testPrompt = "Test";
        
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: testPrompt }],
            max_tokens: 5,
            temperature: 0
        });

        return {
            available: true,
            response_time: Date.now(),
            has_response: response.choices && response.choices.length > 0
        };

    } catch (error) {
        return {
            available: false,
            error: error.message,
            error_code: error.code || 'unknown'
        };
    }
}

/**
 * Check which models are available
 */
async function checkAvailableModels() {
    const results = {};
    
    for (const model of PREFERRED_MODELS) {
        try {
            const testResult = await testModel(model);
            results[model] = testResult;
        } catch (error) {
            results[model] = {
                available: false,
                error: error.message,
                error_code: error.code || 'unknown'
            };
        }
    }

    return results;
}

/**
 * Get the preferred available model
 */
function getPreferredModel() {
    // For now, return the fallback model
    // In a real implementation, you'd cache the results from checkAvailableModels
    return FALLBACK_MODEL;
}

/**
 * Comprehensive API health check
 */
async function checkAPIHealth() {
    try {
        const [openaiHealth, modelsAvailability] = await Promise.all([
            checkOpenAIHealth(),
            checkAvailableModels()
        ]);

        const availableModels = Object.entries(modelsAvailability)
            .filter(([_, status]) => status.available)
            .map(([model, _]) => model);

        return {
            status: openaiHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
            openai_api: openaiHealth,
            models: modelsAvailability,
            available_models: availableModels,
            recommended_model: getPreferredModel(),
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Comprehensive API health check failed:', error);
        
        return {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Test connection with minimal API call
 */
async function testConnection() {
    try {
        logger.info('Testing OpenAI connection...');

        const response = await openai.models.list();
        
        return {
            status: 'connected',
            models_accessible: response.data ? response.data.length : 0,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('OpenAI connection test failed:', error);
        
        return {
            status: 'disconnected',
            error: error.message,
            error_code: error.code || 'unknown',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Get simple health status
 */
async function getHealthStatus() {
    try {
        const health = await checkOpenAIHealth();
        return {
            healthy: health.status === 'healthy',
            model: getPreferredModel(),
            last_check: health.timestamp
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            last_check: new Date().toISOString()
        };
    }
}

module.exports = {
    checkOpenAIHealth,
    testModel,
    checkAvailableModels,
    getPreferredModel,
    checkAPIHealth,
    testConnection,
    getHealthStatus
};