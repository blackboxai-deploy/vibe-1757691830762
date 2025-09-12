import { Deal, RSSFeedItem, DealCategory } from './types';
import { analyzeDeal } from './aiService';

// OzBargain RSS feed URL
const OZBARGAIN_RSS_URL = 'https://www.ozbargain.com.au/deals/feed';

// Cache for deal data
const dealCache = new Map<string, { deals: Deal[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clean expired cache entries
function cleanDealCache(): void {
  const now = Date.now();
  for (const [key, value] of dealCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      dealCache.delete(key);
    }
  }
}

// Extract price information from deal title/description
function extractPriceInfo(text: string): { price: string; originalPrice?: string; discount?: string } {
  // Common price patterns in OzBargain titles
  const pricePatterns = [
    /\$([0-9,]+(?:\.[0-9]{2})?)/g, // $99.99, $1,999
    /([0-9,]+(?:\.[0-9]{2})?\s*(?:AUD|AU|dollars?))/gi, // 99 AUD
    /was\s*\$?([0-9,]+(?:\.[0-9]{2})?)/gi, // was $199
    /([0-9]+)%\s*off/gi, // 50% off
  ];

  const prices: string[] = [];
  const discounts: string[] = [];

  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].includes('%')) {
        discounts.push(match[1] + '%');
      } else {
        prices.push(match[1]);
      }
    }
  }

  // Extract "was" prices for original price
  const wasMatch = text.match(/was\s*\$?([0-9,]+(?:\.[0-9]{2})?)/i);
  const originalPrice = wasMatch ? `$${wasMatch[1]}` : undefined;

  return {
    price: prices.length > 0 ? `$${prices[0]}` : 'Price varies',
    originalPrice,
    discount: discounts.length > 0 ? discounts[0] : undefined
  };
}

// Extract merchant from deal URL or description
function extractMerchant(url: string, description: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Common Australian retailers
    const merchantMap: Record<string, string> = {
      'amazon.com.au': 'Amazon AU',
      'ebay.com.au': 'eBay',
      'woolworths.com.au': 'Woolworths',
      'coles.com.au': 'Coles',
      'jb-hi-fi.com.au': 'JB Hi-Fi',
      'harvey-norman.com.au': 'Harvey Norman',
      'officeworks.com.au': 'Officeworks',
      'kmart.com.au': 'Kmart',
      'target.com.au': 'Target',
      'bigw.com.au': 'Big W',
      'bunnings.com.au': 'Bunnings',
      'catch.com.au': 'Catch',
      'myer.com.au': 'Myer',
      'david-jones.com.au': 'David Jones'
    };

    // Check for exact matches first
    if (merchantMap[hostname]) {
      return merchantMap[hostname];
    }

    // Check for partial matches
    for (const [domain, name] of Object.entries(merchantMap)) {
      if (hostname.includes(domain.split('.')[0])) {
        return name;
      }
    }

    // Extract from domain if not recognized
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }

    return 'Unknown Merchant';
  } catch {
    // Fallback: extract from description
    const merchantMatch = description.match(/@\s*([A-Za-z\s]+)/);
    return merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant';
  }
}

// Generate unique deal ID from title and URL
function generateDealId(title: string, url: string): string {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const urlHash = url.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${cleanTitle.slice(0, 20)}-${Math.abs(urlHash)}`;
}

// Extract image URL from description if available
function extractImageUrl(description: string): string | undefined {
  const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  // Check for other image patterns
  const urlMatch = description.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i);
  return urlMatch ? urlMatch[1] : undefined;
}

// Parse RSS XML to extract deals
async function parseRSSFeed(rssXml: string): Promise<RSSFeedItem[]> {
  const items: RSSFeedItem[] = [];
  
  try {
    // Basic XML parsing - extract item blocks
    const itemMatches = rssXml.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    
    if (!itemMatches) {
      throw new Error('No items found in RSS feed');
    }

    for (const itemXml of itemMatches) {
      // Extract title
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Deal';

      // Extract link
      const linkMatch = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s);
      const link = linkMatch ? linkMatch[1].trim() : '';

      // Extract description
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract publication date
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      // Extract category if present
      const categoryMatch = itemXml.match(/<category><!\[CDATA\[(.*?)\]\]><\/category>/s);
      const category = categoryMatch ? categoryMatch[1].trim() : undefined;

      // Extract GUID
      const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
      const guid = guidMatch ? guidMatch[1].trim() : link;

      if (title && link) {
        items.push({
          title,
          link,
          description,
          pubDate,
          category,
          guid
        });
      }
    }
  } catch (error) {
    console.error('RSS parsing error:', error);
    throw new Error('Failed to parse RSS feed');
  }

  return items;
}

// Convert RSS items to Deal objects
async function convertRSSItemsToDeals(items: RSSFeedItem[]): Promise<Deal[]> {
  const deals: Deal[] = [];

  for (const item of items) {
    try {
      // Extract basic info
      const priceInfo = extractPriceInfo(`${item.title} ${item.description}`);
      const merchant = extractMerchant(item.link, item.description);
      const imageUrl = extractImageUrl(item.description);
      const dealId = generateDealId(item.title, item.link);

      // Get AI analysis
      const aiAnalysis = await analyzeDeal({
        title: item.title,
        description: item.description,
        price: priceInfo.price,
        merchant,
        category: item.category
      });

      // Create deal object
      const deal: Deal = {
        id: dealId,
        title: item.title,
        description: item.description,
        price: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        discount: priceInfo.discount,
        url: item.link,
        imageUrl: imageUrl || `https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/92b51432-1321-4ebc-af2d-d41948e2516b.png + '+Deal+Image')}`,
        merchant,
        category: aiAnalysis.category,
        tags: [aiAnalysis.category.toLowerCase(), merchant.toLowerCase()],
        publishedDate: new Date(item.pubDate),
        upvotes: Math.floor(Math.random() * 100) + 10, // Placeholder
        downvotes: Math.floor(Math.random() * 20), // Placeholder
        comments: Math.floor(Math.random() * 50), // Placeholder
        dealScore: aiAnalysis.qualityScore,
        verified: Math.random() > 0.3, // 70% verified
        featured: aiAnalysis.qualityScore >= 8,
        freebie: priceInfo.price.toLowerCase().includes('free') || priceInfo.price === '$0',
        shipping: {
          cost: Math.random() > 0.5 ? 0 : Math.floor(Math.random() * 20) + 5,
          free: Math.random() > 0.5,
          locations: ['Australia'],
          method: 'Standard'
        },
        couponCode: item.description.match(/code[:\s]+([A-Z0-9]+)/i)?.[1],
        aiInsights: {
          qualityScore: aiAnalysis.qualityScore,
          categoryConfidence: aiAnalysis.categoryConfidence,
          priceAnalysis: aiAnalysis.priceAnalysis,
          sentimentScore: aiAnalysis.sentimentScore,
          popularityPrediction: aiAnalysis.popularityPrediction,
          recommendations: aiAnalysis.recommendations,
          summary: aiAnalysis.summary,
          riskFactors: aiAnalysis.riskFactors,
          generatedAt: new Date()
        }
      };

      deals.push(deal);
    } catch (error) {
      console.error('Error converting RSS item to deal:', error);
      // Continue with other items
    }
  }

  return deals;
}

// Fetch deals from OzBargain RSS feed
export async function fetchDeals(limit: number = 20, useCache: boolean = true): Promise<Deal[]> {
  try {
    // Check cache first
    const cacheKey = `deals_${limit}`;
    if (useCache) {
      const cached = dealCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.deals.slice(0, limit);
      }
    }

    console.log('Fetching fresh deals from OzBargain RSS...');

    // Fetch RSS feed
    const response = await fetch(OZBARGAIN_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Bargains/1.0; +https://example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
    }

    const rssXml = await response.text();
    
    // Parse RSS feed
    const rssItems = await parseRSSFeed(rssXml);
    
    // Convert to deals (limit items to process for performance)
    const itemsToProcess = rssItems.slice(0, limit * 2); // Get extra to account for filtering
    const deals = await convertRSSItemsToDeals(itemsToProcess);

    // Sort by publication date (newest first)
    deals.sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime());

    // Cache results
    dealCache.set(cacheKey, {
      deals: deals.slice(0, limit),
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (dealCache.size > 10) {
      cleanDealCache();
    }

    return deals.slice(0, limit);

  } catch (error) {
    console.error('Error fetching deals:', error);
    
    // Return cached data if available, even if expired
    const cacheKey = `deals_${limit}`;
    const cached = dealCache.get(cacheKey);
    if (cached) {
      console.log('Returning cached deals due to fetch error');
      return cached.deals.slice(0, limit);
    }

    // Return mock deals as last resort
    return getMockDeals(Math.min(limit, 5));
  }
}

// Mock deals for testing/fallback
function getMockDeals(count: number = 5): Deal[] {
  const mockDeals: Deal[] = [];
  
  const templates = [
    {
      title: "Samsung 65\" 4K Smart TV - Massive Discount",
      price: "$899",
      originalPrice: "$1399",
      merchant: "JB Hi-Fi",
      category: "Computing" as DealCategory
    },
    {
      title: "iPhone 15 Pro 128GB - Back in Stock",
      price: "$1299",
      merchant: "Apple Store",
      category: "Mobile" as DealCategory
    },
    {
      title: "Nintendo Switch OLED Console Bundle",
      price: "$449",
      originalPrice: "$539",
      merchant: "EB Games",
      category: "Gaming" as DealCategory
    }
  ];

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const deal: Deal = {
      id: `mock-deal-${i}`,
      title: template.title,
      description: `Great deal on ${template.title}. Limited time offer with excellent value for money.`,
      price: template.price,
      originalPrice: template.originalPrice,
      discount: "30% off",
      url: "https://ozbargain.com.au",
      imageUrl: `https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/cc6250fc-a69f-4613-8e9d-ea52dd851892.png + '+Product+Image')}`,
      merchant: template.merchant,
      category: template.category,
      tags: [template.category.toLowerCase(), template.merchant.toLowerCase()],
      publishedDate: new Date(Date.now() - (i * 60 * 60 * 1000)), // Stagger by hours
      upvotes: Math.floor(Math.random() * 100) + 50,
      downvotes: Math.floor(Math.random() * 20),
      comments: Math.floor(Math.random() * 30) + 5,
      dealScore: Math.floor(Math.random() * 3) + 7, // 7-9
      verified: true,
      featured: i < 2,
      freebie: false,
      shipping: {
        cost: 0,
        free: true,
        locations: ["Australia"],
        method: "Standard"
      },
      aiInsights: {
        qualityScore: Math.floor(Math.random() * 3) + 7,
        categoryConfidence: 0.9,
        priceAnalysis: {
          historicalLow: true,
          priceDropPercentage: 30,
          marketComparison: "excellent"
        },
        sentimentScore: 0.8,
        popularityPrediction: 8,
        recommendations: ["Great value", "Trusted merchant", "Popular product"],
        summary: `Excellent ${template.category.toLowerCase()} deal with significant savings.`,
        riskFactors: ["Limited stock"],
        generatedAt: new Date()
      }
    };
    mockDeals.push(deal);
  }

  return mockDeals;
}

// Get cache statistics
export function getDealCacheStats() {
  cleanDealCache();
  return {
    size: dealCache.size,
    cacheDuration: CACHE_DURATION
  };
}