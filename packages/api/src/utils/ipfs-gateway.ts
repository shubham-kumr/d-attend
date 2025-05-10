import { CID } from 'multiformats/cid';
import { logger } from './logger';
import axios from 'axios';
import LRUCache from 'lru-cache';
import { ipfsService } from '../services/ipfs.service';

// Gateway options
interface GatewayOptions {
  timeout?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

// Available public gateways for fallback
const PUBLIC_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

// Cache for gateway responses
const gatewayCache = new LRUCache<string, { data: any; timestamp: number }>({
  max: 500, // Store max 500 items
  ttl: 1000 * 60 * 60 * 24, // Cache for 24 hours
  updateAgeOnGet: true // Update age when accessed
});

// Cache for resolved URLs
const resolvedUrlCache = new LRUCache<string, { url: string; gateway: string; timestamp: number }>({
  max: 1000,
  ttl: 1000 * 60 * 30, // Cache for 30 minutes
  updateAgeOnGet: true
});

/**
 * Utility functions for working with IPFS content
 */
export const ipfsGateway = {
  /**
   * Convert an IPFS protocol URL (ipfs://) to an HTTP gateway URL
   * @param ipfsUrl IPFS URL in the format ipfs://CID or ipfs://CID/path
   * @param gateway Optional gateway URL, defaults to using available gateways
   * @returns HTTP URL for accessing the content
   */
  getHttpUrl(ipfsUrl: string, gateway = PUBLIC_GATEWAYS[0]): string {
    try {
      if (!ipfsUrl) return '';
      
      // Check cache first
      const cachedUrl = resolvedUrlCache.get(ipfsUrl);
      if (cachedUrl) {
        return cachedUrl.url;
      }
      
      // Handle ipfs:// protocol URLs
      if (ipfsUrl.startsWith('ipfs://')) {
        const path = ipfsUrl.replace('ipfs://', '');
        const httpUrl = `${gateway}${path}`;
        
        // Cache the resolved URL
        resolvedUrlCache.set(ipfsUrl, { 
          url: httpUrl, 
          gateway: gateway,
          timestamp: Date.now() 
        });
        
        return httpUrl;
      }
      
      // If it's already a CID string, just append it to the gateway
      if (ipfsUrl.startsWith('Qm') || ipfsUrl.startsWith('bafy')) {
        try {
          // Validate the CID
          CID.parse(ipfsUrl);
          const httpUrl = `${gateway}${ipfsUrl}`;
          
          // Cache the resolved URL
          resolvedUrlCache.set(ipfsUrl, { 
            url: httpUrl, 
            gateway: gateway,
            timestamp: Date.now() 
          });
          
          return httpUrl;
        } catch (error) {
          logger.error('Invalid CID format:', error);
          return '';
        }
      }
      
      // If it's already an HTTP URL, return as is
      if (ipfsUrl.startsWith('http')) {
        return ipfsUrl;
      }
      
      return '';
    } catch (error) {
      logger.error('Error converting IPFS URL:', error);
      return '';
    }
  },

  /**
   * Extract CID from an IPFS URL
   * @param ipfsUrl IPFS URL in the format ipfs://CID or ipfs://CID/path
   * @returns CID string or empty string if invalid
   */
  getCidFromUrl(ipfsUrl: string): string {
    try {
      if (!ipfsUrl) return '';
      
      if (ipfsUrl.startsWith('ipfs://')) {
        const path = ipfsUrl.replace('ipfs://', '');
        // Extract just the CID part (before any potential path separator)
        const cid = path.split('/')[0];
        return cid;
      }
      
      return '';
    } catch (error) {
      logger.error('Error extracting CID from IPFS URL:', error);
      return '';
    }
  },

  /**
   * Check if a string is a valid IPFS URL
   * @param url URL to check
   * @returns boolean indicating if it's a valid IPFS URL
   */
  isValidIpfsUrl(url: string): boolean {
    if (!url) return false;
    
    if (url.startsWith('ipfs://')) {
      const cid = this.getCidFromUrl(url);
      try {
        CID.parse(cid);
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  },
  
  /**
   * Fetch content from an IPFS URL or CID with fallback gateways and caching
   * @param ipfsUrl The IPFS URL or CID
   * @param options Additional gateway options
   * @returns Content from IPFS
   */
  async fetchContent(ipfsUrl: string, options: GatewayOptions = {}): Promise<any> {
    try {
      // Extract CID
      let cid = ipfsUrl;
      if (ipfsUrl.startsWith('ipfs://')) {
        cid = this.getCidFromUrl(ipfsUrl);
      }
      
      // Check if we've cached this content already
      const cachedContent = gatewayCache.get(cid);
      if (cachedContent) {
        logger.debug(`Returning cached content for CID: ${cid}`);
        return cachedContent.data;
      }
      
      // Try to get from our local IPFS node first (most efficient)
      try {
        const content = await ipfsService.getContentByCid(cid);
        if (content) {
          // Cache the content
          gatewayCache.set(cid, {
            data: content,
            timestamp: Date.now()
          });
          return content;
        }
      } catch (error) {
        logger.debug(`Local IPFS retrieval failed for CID ${cid}, falling back to gateway`, error);
      }
      
      // Try all gateways in sequence until one works
      for (const gateway of PUBLIC_GATEWAYS) {
        try {
          const httpUrl = this.getHttpUrl(ipfsUrl, gateway);
          const response = await axios.get(httpUrl, {
            timeout: options.timeout || 10000, // 10 second timeout
            maxRedirects: options.maxRedirects || 5,
            headers: {
              'Accept': 'application/json, text/plain, */*',
              ...options.headers
            },
            responseType: 'arraybuffer' // Handle binary content
          });
          
          // Process response based on content type
          let data;
          const contentType = response.headers['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            data = JSON.parse(response.data.toString('utf-8'));
          } else if (contentType.includes('text/')) {
            data = response.data.toString('utf-8');
          } else {
            // Binary data
            data = response.data;
          }
          
          // Cache the content
          gatewayCache.set(cid, {
            data,
            timestamp: Date.now()
          });
          
          // Cache this successful gateway for future use
          resolvedUrlCache.set(ipfsUrl, { 
            url: httpUrl, 
            gateway: gateway,
            timestamp: Date.now() 
          });
          
          return data;
        } catch (error) {
          logger.warn(`Gateway ${gateway} failed for CID ${cid}, trying next gateway`, error);
        }
      }
      
      throw new Error(`Failed to retrieve content for ${ipfsUrl} from any gateway`);
    } catch (error) {
      logger.error(`Error fetching content from IPFS for ${ipfsUrl}:`, error);
      throw error;
    }
  },
  
  /**
   * Get a list of best available gateways based on recent performance
   * @returns List of working gateway URLs
   */
  getWorkingGateways(): string[] {
    // Start with default gateways
    const gateways = [...PUBLIC_GATEWAYS];
    
    // Extract gateways from recent successful requests
    const recentSuccessful = [...resolvedUrlCache.entries()]
      .filter(([_, data]) => Date.now() - data.timestamp < 1000 * 60 * 30) // Active in last 30 minutes
      .map(([_, data]) => data.gateway);
    
    // Count frequency of each gateway
    const gatewayCounts = recentSuccessful.reduce((acc, gateway) => {
      acc[gateway] = (acc[gateway] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Sort gateways by success count (most successful first)
    return Object.entries(gatewayCounts)
      .sort(([_, countA], [__, countB]) => countB - countA)
      .map(([gateway]) => gateway);
  },
  
  /**
   * Clear the gateway cache
   */
  clearCache(): void {
    gatewayCache.clear();
    resolvedUrlCache.clear();
  }
};