"use client";

import { Deal } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface DealCardProps {
  deal: Deal;
  compact?: boolean;
  showAIInsights?: boolean;
}

export default function DealCard({ deal, compact = false, showAIInsights = true }: DealCardProps) {
  const formatDate = (date: Date) => {
    const now = Date.now();
    const diffInMinutes = Math.floor((now - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getMarketComparisonBadge = (comparison: string) => {
    const variants = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      average: 'bg-yellow-500',
      poor: 'bg-red-500'
    };
    return variants[comparison as keyof typeof variants] || variants.average;
  };

  if (compact) {
    return (
      <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                src={deal.imageUrl}
                alt={deal.title}
                className="h-16 w-16 rounded-lg object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                {deal.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-lg font-bold text-green-600">{deal.price}</span>
                {deal.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {deal.originalPrice}
                  </span>
                )}
                <Badge variant="secondary" className="text-xs">
                  {deal.merchant}
                </Badge>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(deal.dealScore)}`}>
                {deal.dealScore}/10
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
      {/* Deal Image */}
      <div className="relative">
        <img
          src={deal.imageUrl}
          alt={deal.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {deal.featured && (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              Featured
            </Badge>
          )}
          {deal.freebie && (
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              FREE
            </Badge>
          )}
          {deal.verified && (
            <Badge variant="secondary" className="bg-blue-500 text-white">
              Verified
            </Badge>
          )}
        </div>

        {/* AI Score */}
        <div className="absolute top-3 right-3">
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 backdrop-blur-sm bg-white/90 ${getScoreColor(deal.dealScore)}`}>
            AI: {deal.dealScore}/10
          </div>
        </div>

        {/* Discount Badge */}
        {deal.discount && (
          <div className="absolute bottom-3 right-3">
            <Badge className="bg-red-500 text-white font-bold">
              {deal.discount}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Deal Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <Badge variant="outline" className="text-xs">
              {deal.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(deal.publishedDate)}
            </span>
          </div>

          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {deal.title}
          </h3>

          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-green-600">{deal.price}</span>
            {deal.originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {deal.originalPrice}
                </span>
                <Badge variant="destructive">
                  Save ${(parseFloat(deal.originalPrice.replace('$', '')) - parseFloat(deal.price.replace('$', ''))).toFixed(0)}
                </Badge>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{deal.merchant}</Badge>
              {deal.shipping.free && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Free Shipping
                </Badge>
              )}
              {deal.couponCode && (
                <Badge variant="outline" className="font-mono text-xs">
                  {deal.couponCode}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Community Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-green-600">↑</span>
              <span>{deal.upvotes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-red-600">↓</span>
              <span>{deal.downvotes}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>💬</span>
              <span>{deal.comments}</span>
            </div>
          </div>
          <div className="text-xs">
            Popularity: {deal.aiInsights.popularityPrediction}/10
          </div>
        </div>

        {/* AI Insights */}
        {showAIInsights && deal.aiInsights && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">AI Analysis</h4>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getMarketComparisonBadge(deal.aiInsights.priceAnalysis.marketComparison)} text-white`}>
                  {deal.aiInsights.priceAnalysis.marketComparison.toUpperCase()}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {deal.aiInsights.summary}
              </p>

              {/* Quality Score Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Deal Quality</span>
                  <span>{deal.aiInsights.qualityScore}/10</span>
                </div>
                <Progress value={deal.aiInsights.qualityScore * 10} className="h-2" />
              </div>

              {/* Recommendations */}
              {deal.aiInsights.recommendations.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {deal.aiInsights.recommendations.slice(0, 2).map((rec, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      ✓ {rec}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Risk Factors */}
              {deal.aiInsights.riskFactors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {deal.aiInsights.riskFactors.slice(0, 1).map((risk, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                      ⚠ {risk}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
          <Button 
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            onClick={() => window.open(deal.url, '_blank')}
          >
            View Deal
          </Button>
          <Button variant="outline" size="icon">
            ♡
          </Button>
          <Button variant="outline" size="icon">
            📤
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}