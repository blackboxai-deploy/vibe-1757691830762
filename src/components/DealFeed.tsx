"use client";

import { useState, useEffect, useMemo } from 'react';
import { Deal, DealFilters, LoadingState } from '@/lib/types';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DealFeedProps {
  initialDeals: Deal[];
  filters: DealFilters;
  onFiltersChange: (filters: DealFilters) => void;
}

export default function DealFeed({ initialDeals, filters }: DealFeedProps) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter and sort deals based on current filters
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(searchTerm) ||
        deal.description.toLowerCase().includes(searchTerm) ||
        deal.merchant.toLowerCase().includes(searchTerm) ||
        deal.category.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(deal => 
        filters.categories.includes(deal.category)
      );
    }

    // Apply price range filter
    filtered = filtered.filter(deal => {
      const price = parseFloat(deal.price.replace(/[^0-9.]/g, '')) || 0;
      return price >= filters.priceRange.min && 
             (filters.priceRange.max >= 10000 || price <= filters.priceRange.max);
    });

    // Apply deal score filter
    filtered = filtered.filter(deal => 
      deal.dealScore >= filters.dealScore.min && 
      deal.dealScore <= filters.dealScore.max
    );

    // Apply boolean filters
    if (filters.freeOnly) {
      filtered = filtered.filter(deal => deal.freebie);
    }

    if (filters.verifiedOnly) {
      filtered = filtered.filter(deal => deal.verified);
    }

    if (filters.featuredOnly) {
      filtered = filtered.filter(deal => deal.featured);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
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

    return filtered;
  }, [deals, filters]);

  // Load more deals
  const loadMoreDeals = async () => {
    if (loadingState === 'loading' || !hasMore) return;

    setLoadingState('loading');
    try {
      // Simulate API call to fetch more deals
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, just duplicate some existing deals with modified IDs
      const moreDeals = initialDeals.slice(0, 10).map((deal, index) => ({
        ...deal,
        id: `${deal.id}-page${page + 1}-${index}`,
        publishedDate: new Date(Date.now() - (page * 60 * 60 * 1000) - (index * 10 * 60 * 1000))
      }));

      setDeals(prev => [...prev, ...moreDeals]);
      setPage(prev => prev + 1);
      
      // Stop loading more after a few pages for demo
      if (page >= 3) {
        setHasMore(false);
      }

      setLoadingState('success');
    } catch (error) {
      console.error('Error loading more deals:', error);
      setLoadingState('error');
    }
  };

  // Auto-refresh deals periodically
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // In a real app, this would fetch fresh deals from the API
      console.log('Auto-refreshing deals...');
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  if (deals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🔍</div>
            <h3 className="text-lg font-semibold">No deals found</h3>
            <p className="text-muted-foreground">
              We couldn't find any deals matching your criteria. Try adjusting your filters.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Deals
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {filteredDeals.length === deals.length ? 'Latest Deals' : 'Filtered Results'}
          </h2>
          <p className="text-muted-foreground">
            {filteredDeals.length.toLocaleString()} deal{filteredDeals.length !== 1 ? 's' : ''} found
            {filters.categories.length > 0 && (
              <span> in {filters.categories.join(', ')}</span>
            )}
          </p>
        </div>

        {/* Live Update Indicator */}
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live updates</span>
        </div>
      </div>

      {/* Featured Deals Section */}
      {filteredDeals.some(deal => deal.featured) && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded flex items-center justify-center">
              <span className="text-white text-xs">★</span>
            </div>
            <h3 className="text-lg font-semibold">Featured Deals</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals
              .filter(deal => deal.featured)
              .slice(0, 3)
              .map(deal => (
                <DealCard 
                  key={deal.id} 
                  deal={deal} 
                  showAIInsights={true}
                />
              ))
            }
          </div>
        </div>
      )}

      {/* Main Deals Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {filteredDeals.some(deal => deal.featured) ? 'All Deals' : 'Latest Deals'}
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map(deal => (
            <DealCard 
              key={deal.id} 
              deal={deal} 
              showAIInsights={true}
            />
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loadingState === 'loading' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <div className="relative">
                <Skeleton className="w-full h-48" />
              </div>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && loadingState !== 'loading' && (
        <div className="text-center">
          <Button 
            onClick={loadMoreDeals}
            variant="outline"
            size="lg"
            className="px-8"
          >
            Load More Deals
          </Button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && (
        <div className="text-center py-8">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              You've reached the end of the feed
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Refresh for New Deals
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {loadingState === 'error' && (
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-semibold text-red-600">
                Error Loading More Deals
              </h3>
              <p className="text-muted-foreground">
                We encountered an issue loading more deals. Please try again.
              </p>
              <Button 
                onClick={loadMoreDeals}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}