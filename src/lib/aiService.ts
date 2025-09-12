import { AIAnalysisRequest, AIAnalysisResponse, DealCategory } from './types';

// AI Service Configuration
const AI_CONFIG = {
  endpoint: 'https://oi-server.onrender.com/chat/completions',
  headers: {
    'CustomerId': 'cus_SlQ1P1NMwPoeSk',
    'Content-Type': 'application/json',
    'Authorization': 'Bearer xxx'
  },
  model: 'openrouter/claude-sonnet-4',
  maxTokens: 1000,
  temperature: 0.3
};

// System prompt for deal analysis
const SYSTEM_PROMPT = `You are an AI deal analyst for an Australian bargain-hunting platform similar to OzBargain. 

Analyze deals and provide structured insights including:
1. Deal quality score (1-10, where 10 is exceptional value)
2. Category classification from: Computing, Mobile, Gaming, Home & Garden, Fashion, Health & Beauty, Sports & Outdoors, Automotive, Travel, Food & Dining, Entertainment, Services, Other
3. Price competitiveness analysis
4. Sentiment prediction for community reception
5. Popularity prediction (1-10)
6. Brief summary and recommendations
7. Potential risk factors

Consider Australian market context, pricing, and consumer preferences.

Respond ONLY with valid JSON in this exact format:
{
  "qualityScore": number,
  "category": "Category Name",
  "categoryConfidence": number,
  "sentimentScore": number,
  "popularityPrediction": number,
  "priceAnalysis": {
    "historicalLow": boolean,
    "priceDropPercentage": number,
    "marketComparison": "excellent|good|average|poor"
  },
  "summary": "Brief deal summary",
  "recommendations": ["recommendation1", "recommendation2"],
  "riskFactors": ["risk1", "risk2"]
}`;

// Cache for AI responses (simple in-memory cache)
const analysisCache = new Map<string, { response: AIAnalysisResponse; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Generate cache key from deal data
function generateCacheKey(request: AIAnalysisRequest): string {
  return `${request.title}_${request.price}_${request.merchant}`.toLowerCase();
}

// Clean expired cache entries
function cleanCache(): void {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
    }
  }
}

// Extract price from string (handles various formats)
function extractPrice(priceString: string): number {
  const match = priceString.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

// Fallback analysis when AI service is unavailable
function getFallbackAnalysis(request: AIAnalysisRequest): AIAnalysisResponse {
  const price = extractPrice(request.price);
  
  // Simple category detection based on keywords
  const categoryKeywords: Record<DealCategory, string[]> = {
    'Computing': ['laptop', 'computer', 'pc', 'monitor', 'keyboard', 'mouse', 'cpu', 'gpu', 'ram', 'ssd'],
    'Mobile': ['phone', 'mobile', 'iphone', 'android', 'samsung', 'pixel', 'case', 'charger'],
    'Gaming': ['game', 'gaming', 'xbox', 'playstation', 'nintendo', 'steam', 'controller'],
    'Home & Garden': ['home', 'kitchen', 'furniture', 'garden', 'decor', 'appliance'],
    'Fashion': ['clothing', 'shoes', 'fashion', 'shirt', 'dress', 'jacket', 'jeans'],
    'Health & Beauty': ['beauty', 'health', 'skincare', 'makeup', 'supplement', 'fitness'],
    'Sports & Outdoors': ['sports', 'outdoor', 'exercise', 'bike', 'camping', 'hiking'],
    'Automotive': ['car', 'auto', 'vehicle', 'tire', 'motor', 'driving'],
    'Travel': ['travel', 'flight', 'hotel', 'vacation', 'trip', 'airline'],
    'Food & Dining': ['food', 'restaurant', 'dining', 'delivery', 'grocery', 'meal'],
    'Entertainment': ['movie', 'music', 'book', 'ticket', 'concert', 'show'],
    'Services': ['service', 'subscription', 'membership', 'insurance', 'plan'],
    'Other': []
  };

  let detectedCategory: DealCategory = 'Other';
  let maxMatches = 0;

  const searchText = `${request.title} ${request.description}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => searchText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category as DealCategory;
    }
  }

  return {
    qualityScore: Math.min(10, Math.max(1, 7 + (price > 100 ? -1 : 1))), // Basic scoring
    category: detectedCategory,
    categoryConfidence: maxMatches > 0 ? 0.8 : 0.3,
    sentimentScore: 0.5, // Neutral
    popularityPrediction: Math.min(10, Math.max(1, 6 + Math.floor(Math.random() * 3))),
    priceAnalysis: {
      historicalLow: Math.random() > 0.7, // 30% chance
      priceDropPercentage: Math.floor(Math.random() * 50) + 10, // 10-60%
      marketComparison: price < 50 ? 'good' : price < 200 ? 'average' : 'excellent'
    },
    summary: `${request.title.slice(0, 100)}...`,
    recommendations: ['Check merchant reputation', 'Compare with other retailers', 'Read product reviews'],
    riskFactors: price < 20 ? ['Very low price - verify authenticity'] : ['Standard purchase risks apply']
  };
}

// Main AI analysis function
export async function analyzeDeal(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  try {
    // Check cache first
    const cacheKey = generateCacheKey(request);
    const cached = analysisCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.response;
    }

    // Clean old cache entries periodically
    if (analysisCache.size > 100) {
      cleanCache();
    }

    // Prepare AI request
    const userPrompt = `Analyze this Australian deal:

Title: ${request.title}
Description: ${request.description}
Price: ${request.price}
Merchant: ${request.merchant}
${request.category ? `Suggested Category: ${request.category}` : ''}

Provide your analysis in the specified JSON format.`;

    const aiRequest = {
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature
    };

    // Make API call
    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: AI_CONFIG.headers,
      body: JSON.stringify(aiRequest)
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract content from AI response
    const aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error('Invalid AI response format');
    }

    // Parse JSON response
    const analysis: AIAnalysisResponse = JSON.parse(aiContent);

    // Validate response structure
    if (!analysis.qualityScore || !analysis.category) {
      throw new Error('Incomplete AI analysis response');
    }

    // Cache successful response
    analysisCache.set(cacheKey, {
      response: analysis,
      timestamp: Date.now()
    });

    return analysis;

  } catch (error) {
    console.warn('AI analysis failed, using fallback:', error);
    
    // Return fallback analysis
    const fallbackResponse = getFallbackAnalysis(request);
    
    // Cache fallback response with shorter duration
    const cacheKey = generateCacheKey(request);
    analysisCache.set(cacheKey, {
      response: fallbackResponse,
      timestamp: Date.now() - (CACHE_DURATION * 0.8) // Expire fallback faster
    });

    return fallbackResponse;
  }
}

// Batch analysis for multiple deals
export async function analyzeDeals(requests: AIAnalysisRequest[]): Promise<AIAnalysisResponse[]> {
  const results: AIAnalysisResponse[] = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 3;
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchPromises = batch.map(request => analyzeDeal(request));
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Use fallback for failed analyses
          const fallbackIndex = results.length;
          const fallbackRequest = batch[fallbackIndex % batch.length];
          results.push(getFallbackAnalysis(fallbackRequest));
        }
      }
      
      // Rate limiting: wait between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error('Batch analysis error:', error);
      
      // Add fallback responses for the entire batch
      for (const request of batch) {
        results.push(getFallbackAnalysis(request));
      }
    }
  }

  return results;
}

// Get cache statistics (useful for debugging)
export function getCacheStats() {
  cleanCache(); // Clean before reporting
  return {
    size: analysisCache.size,
    maxSize: 100,
    cacheDuration: CACHE_DURATION
  };
}