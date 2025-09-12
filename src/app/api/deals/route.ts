import { NextRequest, NextResponse } from 'next/server';
import { fetchDeals, getDealCacheStats } from '@/lib/dealFetcher';
import { DealCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/deals - Fetch deals with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 per request
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const category = searchParams.get('category') as DealCategory | null;
    const minScore = parseFloat(searchParams.get('minScore') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const verified = searchParams.get('verified') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const freeOnly = searchParams.get('freeOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const useCache = searchParams.get('fresh') !== 'true'; // Allow bypassing cache

    console.log('Fetching deals with params:', {
      limit, page, category, minScore, maxPrice, verified, featured, freeOnly, sortBy, useCache
    });

    // Fetch deals from OzBargain RSS feed
    const allDeals = await fetchDeals(limit * page, useCache);

    // Apply filters
    let filteredDeals = allDeals;

    if (category) {
      filteredDeals = filteredDeals.filter(deal => deal.category === category);
    }

    if (minScore > 0) {
      filteredDeals = filteredDeals.filter(deal => deal.dealScore >= minScore);
    }

    if (maxPrice < 999999) {
      filteredDeals = filteredDeals.filter(deal => {
        const price = parseFloat(deal.price.replace(/[^0-9.]/g, '')) || 0;
        return price <= maxPrice;
      });
    }

    if (verified) {
      filteredDeals = filteredDeals.filter(deal => deal.verified);
    }

    if (featured) {
      filteredDeals = filteredDeals.filter(deal => deal.featured);
    }

    if (freeOnly) {
      filteredDeals = filteredDeals.filter(deal => deal.freebie);
    }

    // Apply sorting
    filteredDeals.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.publishedDate.getTime() - a.publishedDate.getTime();
        case 'popular':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'score':
          return b.dealScore - a.dealScore;
        case 'price':
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
          return priceA - priceB;
        case 'discount':
          const discountA = parseFloat(a.discount?.replace(/[^0-9.]/g, '') || '0');
          const discountB = parseFloat(b.discount?.replace(/[^0-9.]/g, '') || '0');
          return discountB - discountA;
        default:
          return 0;
      }
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDeals = filteredDeals.slice(startIndex, endIndex);

    // Generate category counts
    const categoryStats = allDeals.reduce((acc, deal) => {
      acc[deal.category] = (acc[deal.category] || 0) + 1;
      return acc;
    }, {} as Record<DealCategory, number>);

    // Ensure all categories are present
    const allCategories: DealCategory[] = [
      'Computing', 'Mobile', 'Gaming', 'Home & Garden', 'Fashion', 
      'Health & Beauty', 'Sports & Outdoors', 'Automotive', 'Travel', 
      'Food & Dining', 'Entertainment', 'Services', 'Other'
    ];
    
    allCategories.forEach(cat => {
      if (!categoryStats[cat]) {
        categoryStats[cat] = 0;
      }
    });

    // Get cache statistics for debugging
    const cacheStats = getDealCacheStats();

    // Prepare response
    const response = {
      deals: paginatedDeals,
      pagination: {
        page,
        limit,
        total: filteredDeals.length,
        hasNext: endIndex < filteredDeals.length,
        totalPages: Math.ceil(filteredDeals.length / limit)
      },
      meta: {
        totalDeals: allDeals.length,
        filteredCount: filteredDeals.length,
        categories: Object.entries(categoryStats).map(([name, count]) => ({
          name: name as DealCategory,
          count
        })),
        lastUpdated: new Date(),
        cacheStats,
        featured: allDeals.filter(d => d.featured).length,
        verified: allDeals.filter(d => d.verified).length,
        avgScore: allDeals.reduce((sum, d) => sum + d.dealScore, 0) / allDeals.length
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // 5min cache, 10min stale
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Deals API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch deals',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// POST /api/deals/refresh - Force refresh deals cache
export async function POST() {
  try {
    console.log('Force refreshing deals cache...');
    
    // Fetch fresh deals without cache
    const freshDeals = await fetchDeals(50, false);
    
    return NextResponse.json({
      success: true,
      message: 'Deals cache refreshed successfully',
      dealCount: freshDeals.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Deals refresh error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to refresh deals',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/deals/stats - Get deals statistics
export async function HEAD() {
  try {
    const deals = await fetchDeals(100, true);
    const cacheStats = getDealCacheStats();
    
    const stats = {
      totalDeals: deals.length,
      featured: deals.filter(d => d.featured).length,
      verified: deals.filter(d => d.verified).length,
      avgScore: deals.reduce((sum, d) => sum + d.dealScore, 0) / deals.length,
      categories: deals.reduce((acc, deal) => {
        acc[deal.category] = (acc[deal.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      cacheStats,
      lastUpdated: new Date()
    };

    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Total-Deals': deals.length.toString(),
        'X-Featured-Deals': stats.featured.toString(),
        'X-Verified-Deals': stats.verified.toString(),
        'X-Avg-Score': stats.avgScore.toFixed(1),
        'X-Cache-Size': cacheStats.size.toString(),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });

  } catch (error) {
    console.error('Deals stats error:', error);
    return new NextResponse(null, { status: 500 });
  }
}