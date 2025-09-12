import { NextRequest, NextResponse } from 'next/server';
import { analyzeDeal, analyzeDeals, getCacheStats } from '@/lib/aiService';
import { AIAnalysisRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST /api/ai-analysis - Analyze a single deal or batch of deals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request format
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    // Handle single deal analysis
    if (body.title && body.description && body.price && body.merchant) {
      const analysisRequest: AIAnalysisRequest = {
        title: body.title,
        description: body.description,
        price: body.price,
        merchant: body.merchant,
        category: body.category
      };

      console.log('Analyzing single deal:', analysisRequest.title);

      const analysis = await analyzeDeal(analysisRequest);

      return NextResponse.json({
        success: true,
        analysis,
        timestamp: new Date(),
        cached: false // This would need to be determined from the service
      });
    }

    // Handle batch deal analysis
    if (Array.isArray(body.deals)) {
      const analysisRequests: AIAnalysisRequest[] = body.deals.map((deal: any) => ({
        title: deal.title,
        description: deal.description,
        price: deal.price,
        merchant: deal.merchant,
        category: deal.category
      }));

      // Validate all deals have required fields
      const invalidDeals = analysisRequests.filter(req => 
        !req.title || !req.description || !req.price || !req.merchant
      );

      if (invalidDeals.length > 0) {
        return NextResponse.json(
          { 
            error: 'All deals must have title, description, price, and merchant',
            invalidCount: invalidDeals.length
          },
          { status: 400 }
        );
      }

      console.log(`Analyzing ${analysisRequests.length} deals in batch`);

      const analyses = await analyzeDeals(analysisRequests);

      return NextResponse.json({
        success: true,
        analyses,
        count: analyses.length,
        timestamp: new Date()
      });
    }

    return NextResponse.json(
      { error: 'Invalid request format. Expected single deal or array of deals.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('AI Analysis API error:', error);
    
    return NextResponse.json(
      {
        error: 'AI analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

// GET /api/ai-analysis/stats - Get AI service statistics
export async function GET() {
  try {
    const cacheStats = getCacheStats();
    
    const stats = {
      aiService: {
        endpoint: 'https://oi-server.onrender.com/chat/completions',
        model: 'openrouter/claude-sonnet-4',
        status: 'operational'
      },
      cache: cacheStats,
      features: [
        'Deal quality scoring (1-10)',
        'Automatic categorization',
        'Price analysis and comparison',
        'Sentiment prediction',
        'Popularity forecasting',
        'Risk factor identification',
        'Smart recommendations'
      ],
      lastUpdated: new Date()
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=300' // 5min cache
      }
    });

  } catch (error) {
    console.error('AI Stats API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get AI statistics' },
      { status: 500 }
    );
  }
}

// POST /api/ai-analysis/test - Test AI service connectivity
export async function PUT() {
  try {
    console.log('Testing AI service connectivity...');

    // Test with a simple deal
    const testDeal: AIAnalysisRequest = {
      title: 'Test Product - Samsung Galaxy Phone',
      description: 'Latest Samsung Galaxy smartphone with great features and competitive pricing.',
      price: '$899',
      merchant: 'Samsung Store'
    };

    const startTime = Date.now();
    const analysis = await analyzeDeal(testDeal);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'AI service is operational',
      testResult: {
        responseTime: `${responseTime}ms`,
        analysis: {
          qualityScore: analysis.qualityScore,
          category: analysis.category,
          categoryConfidence: analysis.categoryConfidence,
          marketComparison: analysis.priceAnalysis.marketComparison
        }
      },
      cacheStats: getCacheStats(),
      timestamp: new Date()
    });

  } catch (error) {
    console.error('AI service test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'AI service test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}