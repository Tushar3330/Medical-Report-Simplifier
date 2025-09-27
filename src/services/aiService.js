const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'gemini';
        
        // OpenAI removed - using Gemini only
        
        // Initialize Gemini if available - but disable for now due to model issues
        // Temporarily disable AI to test fallback functionality
        this.aiDisabled = true;
        
        if (!this.aiDisabled && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
            this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            // Initialize Gemini AI with stable model
            this.geminiModel = this.gemini.getGenerativeModel({ 
                model: process.env.GOOGLE_AI_MODEL || 'gemini-pro'
            });
        }

        logger.info('AI Service initialized', { 
            provider: 'gemini',
            gemini_available: !!this.gemini
        });
    }

    /**
     * Generate AI completion using the configured provider
     */
    async generateCompletion(systemPrompt, userPrompt, options = {}) {
        const { maxTokens = 1000, temperature = 0.3 } = options;

        // If AI is disabled, throw error to trigger fallback
        if (this.aiDisabled) {
            throw new Error('AI service temporarily disabled - using fallback');
        }

        // Use Gemini (since OpenAI was removed)
        return await this.generateGeminiCompletion(systemPrompt, userPrompt, options);
    }

    /**
     * Generate completion using Google Gemini with retry logic
     */
    async generateGeminiCompletion(systemPrompt, userPrompt, options = {}) {
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const combinedPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;
                
                // Add delay between requests to prevent rate limiting
                if (attempt > 1) {
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    logger.info(`Retrying Gemini request (attempt ${attempt}/${maxRetries}) after ${delay}ms delay`);
                    await this.sleep(delay);
                }
                
                const result = await this.geminiModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
                    generationConfig: {
                        maxOutputTokens: options.maxTokens || 1000,
                        temperature: options.temperature || 0.3,
                    }
                });

                const response = result.response;
                const text = response.text();

                logger.info('Gemini completion successful', {
                    prompt_length: combinedPrompt.length,
                    response_length: text.length,
                    attempt: attempt
                });

                return {
                    success: true,
                    content: text,
                    provider: 'gemini',
                    model: 'models/gemini-2.0-flash-exp',
                    usage: {
                        prompt_tokens: combinedPrompt.length / 4, // Rough estimation
                        completion_tokens: text.length / 4,
                        total_tokens: (combinedPrompt.length + text.length) / 4
                    }
                };

            } catch (error) {
                const isRetryable = error.message.includes('503') || 
                                   error.message.includes('overloaded') || 
                                   error.message.includes('rate limit') ||
                                   error.message.includes('429');
                
                if (attempt === maxRetries || !isRetryable) {
                    logger.error(`Gemini completion failed after ${attempt} attempts:`, error);
                    throw new Error(`Gemini AI error: ${error.message}`);
                }
                
                logger.warn(`Gemini attempt ${attempt} failed, retrying:`, error.message);
            }
        }
    }

    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    /**
     * Check health of available AI providers
     */
    async checkHealth() {
        const health = {
            timestamp: new Date().toISOString(),
            providers: {}
        };

        // Test Gemini
        if (this.gemini) {
            try {
                await this.generateGeminiCompletion(
                    'You are a test assistant.',
                    'Say "OK" if you can read this.',
                    { maxTokens: 10 }
                );
                health.providers.gemini = { status: 'healthy', available: true };
            } catch (error) {
                health.providers.gemini = { 
                    status: 'unhealthy', 
                    available: false, 
                    error: error.message 
                };
            }
        } else {
            health.providers.gemini = { 
                status: 'unavailable', 
                available: false, 
                reason: 'No API key configured' 
            };
        }

        // OpenAI removed

        // Determine overall status
        const availableProviders = Object.values(health.providers)
            .filter(p => p.available && p.status === 'healthy');
        
        health.status = availableProviders.length > 0 ? 'healthy' : 'unhealthy';
        health.active_provider = 'gemini';
        health.available_providers = availableProviders.length;

        return health;
    }

    /**
     * Get current provider info (JSON-safe)
     */
    getProviderInfo() {
        return {
            current_provider: 'gemini',
            providers_available: {
                gemini: {
                    configured: !!this.gemini,
                    api_key_present: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here')
                }
            },
            fallback_available: false,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new AIService();