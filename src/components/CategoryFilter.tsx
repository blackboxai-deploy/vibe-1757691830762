"use client";

import { useState } from 'react';
import { DealCategory, DealFilters } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface CategoryFilterProps {
  filters: DealFilters;
  onFiltersChange: (filters: DealFilters) => void;
  dealCounts: Record<DealCategory, number>;
  totalDeals: number;
}

const CATEGORIES: Array<{ name: DealCategory; icon: string }> = [
  { name: 'Computing', icon: '💻' },
  { name: 'Mobile', icon: '📱' },
  { name: 'Gaming', icon: '🎮' },
  { name: 'Home & Garden', icon: '🏠' },
  { name: 'Fashion', icon: '👕' },
  { name: 'Health & Beauty', icon: '💅' },
  { name: 'Sports & Outdoors', icon: '⚽' },
  { name: 'Automotive', icon: '🚗' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Food & Dining', icon: '🍕' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Services', icon: '🔧' },
  { name: 'Other', icon: '📦' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'score', label: 'AI Score' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'discount', label: 'Best Discount' }
];

export default function CategoryFilter({ 
  filters, 
  onFiltersChange, 
  dealCounts,
  totalDeals 
}: CategoryFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<DealFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleCategory = (category: DealCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: { min: 0, max: 10000 },
      dealScore: { min: 1, max: 10 },
      freeOnly: false,
      verifiedOnly: false,
      featuredOnly: false,
      sortBy: 'newest',
      searchQuery: ''
    });
  };

  const hasActiveFilters = 
    filters.categories.length > 0 || 
    filters.freeOnly || 
    filters.verifiedOnly || 
    filters.featuredOnly ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < 10000 ||
    filters.dealScore.min > 1 ||
    filters.dealScore.max < 10;

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">Filters</h3>
              {hasActiveFilters && (
                <Badge variant="secondary">
                  {filters.categories.length + 
                   (filters.freeOnly ? 1 : 0) + 
                   (filters.verifiedOnly ? 1 : 0) + 
                   (filters.featuredOnly ? 1 : 0)} active
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Less' : 'More'} Filters
              </Button>
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-4 mb-4">
            <Label htmlFor="sort">Sort by:</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilters({ sortBy: value as any })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Toggle Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="free-only"
                checked={filters.freeOnly}
                onCheckedChange={(checked) => updateFilters({ freeOnly: checked })}
              />
              <Label htmlFor="free-only" className="text-sm">Free Only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="verified-only"
                checked={filters.verifiedOnly}
                onCheckedChange={(checked) => updateFilters({ verifiedOnly: checked })}
              />
              <Label htmlFor="verified-only" className="text-sm">Verified</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured-only"
                checked={filters.featuredOnly}
                onCheckedChange={(checked) => updateFilters({ featuredOnly: checked })}
              />
              <Label htmlFor="featured-only" className="text-sm">Featured</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Categories</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {CATEGORIES.map(category => {
              const count = dealCounts[category.name] || 0;
              const isSelected = filters.categories.includes(category.name);
              
              return (
                <Button
                  key={category.name}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`justify-start h-auto p-3 ${isSelected ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  onClick={() => toggleCategory(category.name)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <span className="text-xs font-medium">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4 space-y-6">
            <h4 className="font-medium">Advanced Filters</h4>
            
            {/* Price Range */}
            <div className="space-y-3">
              <Label>Price Range</Label>
              <div className="px-2">
                <Slider
                  value={[filters.priceRange.min, filters.priceRange.max]}
                  onValueChange={([min, max]) => 
                    updateFilters({ priceRange: { min, max } })
                  }
                  min={0}
                  max={10000}
                  step={50}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${filters.priceRange.min}</span>
                <span>${filters.priceRange.max === 10000 ? '10,000+' : filters.priceRange.max}</span>
              </div>
            </div>

            <Separator />

            {/* AI Score Range */}
            <div className="space-y-3">
              <Label>Minimum AI Score</Label>
              <div className="px-2">
                <Slider
                  value={[filters.dealScore.min]}
                  onValueChange={([min]) => 
                    updateFilters({ dealScore: { ...filters.dealScore, min } })
                  }
                  min={1}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Score: {filters.dealScore.min}/10</span>
                <span>Higher scores = Better deals</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-muted-foreground">
        {hasActiveFilters ? (
          <span>
            Showing filtered results • {totalDeals.toLocaleString()} deals found
          </span>
        ) : (
          <span>
            Showing all deals • {totalDeals.toLocaleString()} total deals
          </span>
        )}
      </div>
    </div>
  );
}