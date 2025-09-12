// Core Deal Interface
export interface Deal {
  id: string;
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  url: string;
  imageUrl?: string;
  merchant: string;
  category: DealCategory;
  tags: string[];
  publishedDate: Date;
  expiryDate?: Date;
  upvotes: number;
  downvotes: number;
  comments: number;
  dealScore: number; // AI-generated score 1-10
  verified: boolean;
  featured: boolean;
  freebie: boolean;
  shipping: ShippingInfo;
  couponCode?: string;
  aiInsights: AIInsights;
}

// Deal Categories
export type DealCategory = 
  | 'Computing'
  | 'Mobile'
  | 'Gaming'
  | 'Home & Garden'
  | 'Fashion'
  | 'Health & Beauty'
  | 'Sports & Outdoors'
  | 'Automotive'
  | 'Travel'
  | 'Food & Dining'
  | 'Entertainment'
  | 'Services'
  | 'Other';

// Shipping Information
export interface ShippingInfo {
  cost: number;
  free: boolean;
  locations: string[];
  method: string;
}

// AI-Generated Insights
export interface AIInsights {
  qualityScore: number; // 1-10
  categoryConfidence: number; // 0-1
  priceAnalysis: PriceAnalysis;
  sentimentScore: number; // -1 to 1
  popularityPrediction: number; // 1-10
  recommendations: string[];
  summary: string;
  riskFactors: string[];
  generatedAt: Date;
}

// Price Analysis
export interface PriceAnalysis {
  historicalLow: boolean;
  priceDropPercentage: number;
  marketComparison: 'excellent' | 'good' | 'average' | 'poor';
  competitorPrices?: Array<{
    merchant: string;
    price: number;
  }>;
}

// Deal Filters
export interface DealFilters {
  categories: DealCategory[];
  priceRange: {
    min: number;
    max: number;
  };
  dealScore: {
    min: number;
    max: number;
  };
  freeOnly: boolean;
  verifiedOnly: boolean;
  featuredOnly: boolean;
  sortBy: 'newest' | 'popular' | 'score' | 'price' | 'discount';
  searchQuery: string;
}

// API Responses
export interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  meta: {
    totalDeals: number;
    categories: Array<{
      name: DealCategory;
      count: number;
    }>;
    lastUpdated: Date;
  };
}

// RSS Feed Item (raw from OzBargain)
export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  guid: string;
}

// AI Service Request/Response
export interface AIAnalysisRequest {
  title: string;
  description: string;
  price: string;
  merchant: string;
  category?: string;
}

export interface AIAnalysisResponse {
  qualityScore: number;
  category: DealCategory;
  categoryConfidence: number;
  sentimentScore: number;
  popularityPrediction: number;
  priceAnalysis: {
    historicalLow: boolean;
    priceDropPercentage: number;
    marketComparison: 'excellent' | 'good' | 'average' | 'poor';
  };
  summary: string;
  recommendations: string[];
  riskFactors: string[];
}

// Component Props
export interface DealCardProps {
  deal: Deal;
  compact?: boolean;
  showAIInsights?: boolean;
}

export interface DealFeedProps {
  initialDeals: Deal[];
  filters: DealFilters;
  onFiltersChange: (filters: DealFilters) => void;
}

export interface CategoryFilterProps {
  selectedCategories: DealCategory[];
  onCategoriesChange: (categories: DealCategory[]) => void;
  dealCounts: Record<DealCategory, number>;
}

// Error Types
export interface APIError {
  message: string;
  code: string;
  details?: any;
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// User Preferences (for future features)
export interface UserPreferences {
  favoriteCategories: DealCategory[];
  priceAlerts: Array<{
    keyword: string;
    maxPrice: number;
  }>;
  notifications: {
    email: boolean;
    push: boolean;
    frequency: 'instant' | 'hourly' | 'daily';
  };
}