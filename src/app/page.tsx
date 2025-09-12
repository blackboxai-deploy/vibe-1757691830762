"use client";

import { useState, useEffect } from 'react';
import { Deal, DealFilters, DealCategory } from '@/lib/types';
import Header from '@/components/Header';
import DealFeed from '@/components/DealFeed';
import CategoryFilter from '@/components/CategoryFilter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter state
  const [filters, setFilters] = useState<DealFilters>({
    categories: [],
    priceRange: { min: 0, max: 10000 },
    dealScore: { min: 1, max: 10 },
    freeOnly: false,
    verifiedOnly: false,
    featuredOnly: false,
    sortBy: 'newest',
    searchQuery: ''
  });

  // Deal category counts
  const [categoryStats, setCategoryStats] = useState<Record<DealCategory, number>>({
    'Computing': 0,
    'Mobile': 0,
    'Gaming': 0,
    'Home & Garden': 0,
    'Fashion': 0,
    'Health & Beauty': 0,
    'Sports & Outdoors': 0,
    'Automotive': 0,
    'Travel': 0,
    'Food & Dining': 0,
    'Entertainment': 0,
    'Services': 0,
    'Other': 0
  });

  // Fetch deals from API
  const fetchDeals = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '50',
        page: '1',
        fresh: refresh ? 'true' : 'false'
      });

      console.log('Fetching deals from API...');
      
      const response = await fetch(`/api/deals?${params}`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      setDeals(data.deals || []);
      setLastUpdated(new Date(data.meta?.lastUpdated || Date.now()));
      
      // Update category statistics
      if (data.meta?.categories) {
        const newStats = { ...categoryStats };
        data.meta.categories.forEach((cat: { name: DealCategory; count: number }) => {
          newStats[cat.name] = cat.count;
        });
        setCategoryStats(newStats);
      }

      console.log(`Loaded ${data.deals?.length || 0} deals`);

    } catch (error) {
      console.error('Error fetching deals:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deals');
      
      // Load mock data as fallback
      setDeals(getMockDeals());
      
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh deals every 5 minutes
  useEffect(() => {
    fetchDeals(false);
    
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing deals...');
      fetchDeals(false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Search handler
  const handleSearchChange = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  // Mock deals for fallback
  const getMockDeals = (): Deal[] => {
    return [
      {
        id: 'mock-1',
        title: 'Samsung 65" 4K QLED Smart TV - Massive Black Friday Sale',
        description: 'Incredible deal on Samsung\'s premium 4K QLED TV with HDR10+ and smart features. Usually $1499, now at an all-time low price!',
        price: '$899',
        originalPrice: '$1499',
        discount: '40% off',
        url: 'https://ozbargain.com.au',
        imageUrl: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/58e63b69-a10b-4364-91c5-1bb20e6a9ecb.png',
        merchant: 'JB Hi-Fi',
        category: 'Computing',
        tags: ['tv', 'samsung', 'electronics'],
        publishedDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        upvotes: 156,
        downvotes: 8,
        comments: 23,
        dealScore: 9.2,
        verified: true,
        featured: true,
        freebie: false,
        shipping: { cost: 0, free: true, locations: ['Australia'], method: 'Express' },
        aiInsights: {
          qualityScore: 9.2,
          categoryConfidence: 0.95,
          priceAnalysis: {
            historicalLow: true,
            priceDropPercentage: 40,
            marketComparison: 'excellent'
          },
          sentimentScore: 0.9,
          popularityPrediction: 9,
          recommendations: ['Excellent brand reputation', 'Strong warranty support', 'Premium features'],
          summary: 'Outstanding TV deal with significant savings on a premium Samsung QLED model.',
          riskFactors: ['Limited stock available'],
          generatedAt: new Date()
        }
      },
      {
        id: 'mock-2',
        title: 'iPhone 15 Pro 128GB - Back in Stock + Free AirPods',
        description: 'Latest iPhone 15 Pro now available with bonus AirPods (3rd gen). Official Apple warranty included.',
        price: '$1299',
        originalPrice: '$1629',
        discount: '20% off',
        url: 'https://ozbargain.com.au',
        imageUrl: 'https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/da1b9313-00c0-41a2-8ed2-d2995fca0615.png',
        merchant: 'Apple Store',
        category: 'Mobile',
        tags: ['iphone', 'apple', 'smartphone'],
        publishedDate: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        upvotes: 89,
        downvotes: 12,
        comments: 45,
        dealScore: 8.5,
        verified: true,
        featured: true,
        freebie: false,
        shipping: { cost: 0, free: true, locations: ['Australia'], method: 'Express' },
        aiInsights: {
          qualityScore: 8.5,
          categoryConfidence: 0.98,
          priceAnalysis: {
            historicalLow: false,
            priceDropPercentage: 20,
            marketComparison: 'good'
          },
          sentimentScore: 0.8,
          popularityPrediction: 8,
          recommendations: ['Latest model', 'Includes bonus AirPods', 'Official warranty'],
          summary: 'Great iPhone deal with valuable bonus accessories from official Apple store.',
          riskFactors: ['High demand item', 'Stock may sell out quickly'],
          generatedAt: new Date()
        }
      }
    ];
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          searchQuery={filters.searchQuery}
          onSearchChange={handleSearchChange}
          dealCount={deals.length}
        />
        
        <div className="container mx-auto px-4 py-8">
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="text-6xl">⚠️</div>
                <h2 className="text-2xl font-bold text-red-600">Error Loading Deals</h2>
                <p className="text-muted-foreground">{error}</p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={() => fetchDeals(true)}>
                    Retry
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header 
        searchQuery={filters.searchQuery}
        onSearchChange={handleSearchChange}
        dealCount={deals.length}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full px-4 py-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Live from OzBargain.com.au</span>
            <Badge variant="secondary" className="font-mono text-xs">
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            <span>Australian Bargains</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover the best deals with intelligent AI analysis, real-time updates, and personalized recommendations
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center space-x-8 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {deals.length.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Live Deals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {deals.filter(d => d.featured).length}
              </div>
              <div className="text-sm text-muted-foreground">Featured</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {deals.filter(d => d.verified).length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {deals.length > 0 ? (deals.reduce((sum, d) => sum + d.dealScore, 0) / deals.length).toFixed(1) : '0.0'}
              </div>
              <div className="text-sm text-muted-foreground">Avg AI Score</div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && deals.length === 0 && (
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="lg:col-span-3 space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="w-full h-48" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        {!loading || deals.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Sidebar - Filters */}
            <div className="lg:col-span-1">
              <CategoryFilter
                filters={filters}
                onFiltersChange={setFilters}
                dealCounts={categoryStats}
                totalDeals={deals.length}
              />
            </div>

            {/* Main Content - Deals Feed */}
            <div className="lg:col-span-3">
              <DealFeed
                initialDeals={deals}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}