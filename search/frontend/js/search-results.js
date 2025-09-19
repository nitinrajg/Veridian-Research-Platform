// ===============================================
// PERSISTENT SEARCH ANALYTICS SYSTEM
// ===============================================

// --- Global Analytics Storage ---
class PersistentSearchAnalytics {
    constructor() {
        this.storageKey = 'veridianSearchHistory';
        this.analyticsKey = 'veridianAnalyticsData';
        this.init();
    }

    init() {
        console.log('🔧 Initializing Persistent Search Analytics...');
        
        // Ensure storage exists
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
        
        // Initialize analytics data structure
        this.initializeAnalyticsData();
        
        console.log('✅ Persistent Search Analytics initialized');
    }

    // Initialize analytics data structure
    initializeAnalyticsData() {
        const existingData = localStorage.getItem(this.analyticsKey);
        if (!existingData) {
            const initialData = {
                totalSearches: 0,
                mlEnhancedSearches: 0,
                totalResponseTime: 0,
                totalConfidence: 0,
                successfulSearches: 0,
                searchHistory: [],
                lastUpdated: new Date().toISOString(),
                version: '2.0.0'
            };
            localStorage.setItem(this.analyticsKey, JSON.stringify(initialData));
        }
    }

    // Record a search with complete data
    recordSearch(searchData) {
        try {
            const timestamp = new Date().toISOString();
            const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create complete search record
            const searchRecord = {
                id: searchId,
                timestamp: timestamp,
                query: searchData.query || '',
                mlEnhanced: Boolean(searchData.mlEnhanced),
                responseTime: Number(searchData.responseTime) || 0,
                confidence: Number(searchData.confidence) || 0.5,
                resultCount: Number(searchData.resultCount) || 0,
                status: searchData.status || 'success',
                explanation: searchData.explanation || [],
                queryLength: searchData.query ? searchData.query.split(' ').length : 0,
                filters: searchData.filters || {},
                searchType: searchData.searchType || 'standard'
            };

            console.log('📊 Recording search:', searchRecord);

            // Store in search history
            this.addToSearchHistory(searchRecord);
            
            // Update analytics data
            this.updateAnalyticsData(searchRecord);
            
            // Trigger update event
            this.triggerAnalyticsUpdate();
            
            console.log('✅ Search recorded successfully');
            return searchRecord;
            
        } catch (error) {
            console.error('❌ Failed to record search:', error);
            return null;
        }
    }

    // Add to search history
    addToSearchHistory(searchRecord) {
        const history = this.getSearchHistory();
        history.unshift(searchRecord);
        
        // Keep only last 100 searches
        if (history.length > 100) {
            history.splice(100);
        }
        
        localStorage.setItem(this.storageKey, JSON.stringify(history));
    }

    // Update analytics data
    updateAnalyticsData(searchRecord) {
        const analyticsData = JSON.parse(localStorage.getItem(this.analyticsKey));
        
        analyticsData.totalSearches += 1;
        analyticsData.totalResponseTime += searchRecord.responseTime;
        analyticsData.totalConfidence += searchRecord.confidence;
        
        if (searchRecord.mlEnhanced) {
            analyticsData.mlEnhancedSearches += 1;
        }
        
        if (searchRecord.status === 'success') {
            analyticsData.successfulSearches += 1;
        }
        
        analyticsData.lastUpdated = new Date().toISOString();
        
        localStorage.setItem(this.analyticsKey, JSON.stringify(analyticsData));
        
        console.log('📈 Analytics data updated:', analyticsData);
    }

    // Get search history
    getSearchHistory() {
        try {
            const history = localStorage.getItem(this.storageKey);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Failed to get search history:', error);
            return [];
        }
    }

    // Get analytics data
    getAnalyticsData() {
        try {
            const data = localStorage.getItem(this.analyticsKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to get analytics data:', error);
            return null;
        }
    }

    // Get calculated metrics
    getCalculatedMetrics() {
        const analyticsData = this.getAnalyticsData();
        const searchHistory = this.getSearchHistory();
        
        if (!analyticsData || searchHistory.length === 0) {
            return {
                totalSearches: 0,
                mlEnhancementRate: 0,
                averageResponseTime: 0,
                averageConfidence: 0,
                successRate: 0,
                searchesToday: 0,
                averageQueryLength: 0,
                lastSearchTime: null
            };
        }
        
        // Calculate metrics from actual data
        const totalSearches = analyticsData.totalSearches;
        const mlEnhanced = analyticsData.mlEnhancedSearches;
        const avgResponseTime = totalSearches > 0 ? analyticsData.totalResponseTime / totalSearches : 0;
        const avgConfidence = totalSearches > 0 ? analyticsData.totalConfidence / totalSearches : 0;
        const successRate = totalSearches > 0 ? analyticsData.successfulSearches / totalSearches : 0;
        
        // Today's searches
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const searchesToday = searchHistory.filter(s => 
            new Date(s.timestamp) >= today
        ).length;
        
        // Average query length
        const avgQueryLength = searchHistory.length > 0 ?
            searchHistory.reduce((sum, s) => sum + s.queryLength, 0) / searchHistory.length : 0;
        
        // Last search time
        const lastSearchTime = searchHistory.length > 0 ? searchHistory[0].timestamp : null;
        
        return {
            totalSearches,
            mlEnhancementRate: totalSearches > 0 ? (mlEnhanced / totalSearches) * 100 : 0,
            averageResponseTime: Math.round(avgResponseTime),
            averageConfidence: Math.round(avgConfidence * 100),
            successRate: Math.round(successRate * 100),
            searchesToday,
            averageQueryLength: Math.round(avgQueryLength * 10) / 10,
            lastSearchTime
        };
    }

    // Get hourly stats for charts
    getHourlyStats() {
        const searchHistory = this.getSearchHistory();
        const hourlyStats = [];
        const now = new Date();
        
        // Generate stats for last 24 hours
        for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
            hour.setMinutes(0, 0, 0);
            
            const hourSearches = searchHistory.filter(s => {
                const searchTime = new Date(s.timestamp);
                return searchTime.getHours() === hour.getHours() &&
                       searchTime.getDate() === hour.getDate() &&
                       searchTime.getMonth() === hour.getMonth();
            });
            
            const avgResponseTime = hourSearches.length > 0 ?
                hourSearches.reduce((sum, s) => sum + s.responseTime, 0) / hourSearches.length : 0;
            
            const mlEnhancementRate = hourSearches.length > 0 ?
                hourSearches.filter(s => s.mlEnhanced).length / hourSearches.length : 0;
            
            const avgConfidence = hourSearches.length > 0 ?
                hourSearches.reduce((sum, s) => sum + s.confidence, 0) / hourSearches.length : 0;
            
            hourlyStats.push({
                hour: hour.getHours(),
                searchCount: hourSearches.length,
                averageResponseTime: Math.round(avgResponseTime),
                mlEnhancementRate: mlEnhancementRate,
                averageConfidence: avgConfidence,
                timestamp: hour.toISOString()
            });
        }
        
        return hourlyStats;
    }

    // Trigger analytics update event
    triggerAnalyticsUpdate() {
        const event = new CustomEvent('analyticsDataUpdated', {
            detail: {
                timestamp: new Date().toISOString(),
                searchCount: this.getSearchHistory().length,
                metrics: this.getCalculatedMetrics()
            }
        });
        
        window.dispatchEvent(event);
        
        // Also trigger storage event for cross-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
            key: this.storageKey,
            newValue: localStorage.getItem(this.storageKey),
            url: window.location.href
        }));
    }

    // Clear all data
    clearAllData() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.analyticsKey);
        this.init();
        console.log('🗑️ All analytics data cleared');
    }

    // Get data summary for debugging
    getDataSummary() {
        const history = this.getSearchHistory();
        const analytics = this.getAnalyticsData();
        const metrics = this.getCalculatedMetrics();
        
        return {
            searchHistoryCount: history.length,
            analyticsData: analytics,
            calculatedMetrics: metrics,
            recentSearches: history.slice(0, 5),
            storageSize: {
                searchHistory: JSON.stringify(history).length,
                analyticsData: JSON.stringify(analytics).length
            }
        };
    }
}

// Create global instance
const persistentAnalytics = new PersistentSearchAnalytics();

// Make available globally
window.persistentAnalytics = persistentAnalytics;

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAPYnY1xd2d1leUH5gZMI5DQLVs4IHWyJI",
  authDomain: "research-it-auth.firebaseapp.com",
  projectId: "research-it-auth",
  storageBucket: "research-it-auth.appspot.com",
  messagingSenderId: "582978351290",
  appId: "1:582978351290:web:2e5e0089bd44a423a45283",
  measurementId: "G-HT6WX036QK"
};

// Initialize Firebase safely
try {
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (error) {
  console.warn('Firebase initialization failed:', error);
}

// --- Global Variables ---
let enhancedPubMedSearch = null;
let mlQueryProcessor = null;
let currentOffset = 0;
let isLoading = false;
let hasMoreResults = true;
let currentQuery = '';
let currentFilters = { year: '', field: '', sort: 'relevance' };
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

// Python backend configuration
const API_BASE_URL = 'http://127.0.0.1:5000';
let useBackendAnalytics = true;

// Note: API_BASE_URL remains the same as it's an HTTP endpoint, not a file path

// --- MeSH Suggestions ---
const meshSuggestions = [
  "Diabetes Mellitus", "Hypertension", "Asthma", "Cancer", "Stroke",
  "Obesity", "Depression", "Heart Failure", "Neoplasms", "COVID-19",
  "Lung Diseases", "Breast Neoplasms", "HIV Infections", "Osteoporosis",
  "Myocardial Infarction", "Alzheimer Disease", "Autism Spectrum Disorder",
  "Parkinson Disease", "Metabolic Syndrome", "Tuberculosis",
  "Anxiety Disorders", "Arthritis", "Chronic Kidney Disease",
  "Skin Neoplasms", "Malaria", "Influenza, Human",
  "Rheumatoid Arthritis", "Epilepsy", "Coronary Artery Disease"
];

// --- DOM Elements ---
const elements = {
  searchInput: null,
  searchBtn: null,
  filterBtn: null,
  filtersPanel: null,
  searchTitle: null,
  searchSubtitle: null,
  resultsInfo: null,
  loading: null,
  error: null,
  noResults: null,
  resultsList: null,
  loadMoreBtn: null,
  retryBtn: null,
  applyFiltersBtn: null,
  yearFilter: null,
  fieldFilter: null,
  sortFilter: null,
  errorMessage: null,
  meshSuggestionsBar: null,
  meshSuggestionsList: null
};

// --- Hybrid PubMed + Semantic Scholar Search with Analytics ---
async function searchPapers(query, offset = 0, limit = 10) {
  console.log('🔍 Starting hybrid search for:', query, offset, limit);
  
  const searchStartTime = performance.now();
  
  try {
    // Step 1: Search PubMed for medical/biomedical papers
    console.log('📚 Searching PubMed API...');
    const pubmedResults = await searchPubMed(query, offset, Math.ceil(limit/2));
    
    // Step 2: Search Semantic Scholar for broader academic coverage
    console.log('🔍 Searching Semantic Scholar API...');
    const scholarResults = await searchSemanticScholar(query, offset, Math.ceil(limit/2));
    
    // Step 3: Combine and deduplicate results
    const combinedResults = combineSearchResults(pubmedResults, scholarResults, limit);
    
    // Calculate response time
    const searchEndTime = performance.now();
    const responseTime = Math.round(searchEndTime - searchStartTime);
    
    // Calculate search quality metrics
    const searchQuality = calculateSearchQuality(combinedResults, query);
    
    // Transform result
    const searchResult = {
      data: combinedResults.papers || [],
      total: combinedResults.totalFound || 0,
      mlEnhanced: false, // Pure API-based search
      confidence: searchQuality.confidence,
      explanation: [`Found ${combinedResults.pubmedCount} PubMed papers, ${combinedResults.scholarCount} Semantic Scholar papers`],
      responseTime: responseTime,
      sources: combinedResults.sources
    };
    
    // SEARCH PERFORMANCE ANALYTICS RECORDING
    console.log('📊 Recording search performance analytics for:', query);
    console.log('📊 Results: PubMed =', combinedResults.pubmedCount, ', Scholar =', combinedResults.scholarCount);
    console.log('📊 Search quality confidence:', searchQuality.confidence);
    
    const analyticsData = {
      query: query,
      mlEnhanced: false, // Pure API search
      responseTime: responseTime,
      confidence: searchQuality.confidence,
      resultCount: searchResult.data.length,
      status: 'success',
      explanation: searchResult.explanation,
      searchType: offset === 0 ? 'new_search' : 'load_more',
      filters: { ...currentFilters },
      sources: {
        pubmed: combinedResults.pubmedCount,
        scholar: combinedResults.scholarCount,
        total: combinedResults.totalFound
      },
      searchAccuracy: searchQuality.accuracy
    };
    
    await recordSearchAnalytics(analyticsData);
    
    return searchResult;
    
  } catch (error) {
    console.error('❌ Search failed:', error);
    
    const searchEndTime = performance.now();
    const responseTime = Math.round(searchEndTime - searchStartTime);
    
    // Record error analytics
    console.log('📊 Recording error analytics for search:', query);
    await recordSearchAnalytics({
      query: query,
      mlEnhanced: false,
      responseTime: responseTime,
      confidence: 0,
      resultCount: 0,
      status: 'error',
      explanation: ['Search API failed'],
      searchType: offset === 0 ? 'new_search' : 'load_more',
      filters: { ...currentFilters }
    });
    
    throw error;
  }
}

// --- Fallback Search ---
async function fallbackSearch(query, offset = 0, limit = 10) {
  const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
  const fields = 'paperId,title,abstract,authors,year,citationCount,influentialCitationCount,fieldsOfStudy,url,venue,publicationDate';
  
  let searchUrl = `${baseUrl}?query=${encodeURIComponent(query)}&fields=${fields}&limit=${limit}&offset=${offset}`;
  
  // Apply filters
  if (currentFilters.year) {
    searchUrl += `&year=${currentFilters.year}`;
  }
  if (currentFilters.field) {
    searchUrl += `&fieldsOfStudy=${encodeURIComponent(currentFilters.field)}`;
  }

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Veridian Research Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();

  // Apply client-side sorting
  if (data.data && currentFilters.sort !== 'relevance') {
    data.data.sort((a, b) => {
      switch (currentFilters.sort) {
        case 'citationCount':
          return (b.citationCount || 0) - (a.citationCount || 0);
        case 'publicationDate':
          return (b.year || 0) - (a.year || 0);
        case 'influentialCitationCount':
          return (b.influentialCitationCount || 0) - (a.influentialCitationCount || 0);
        default:
          return 0;
      }
    });
  }

  return data;
}

// --- PubMed API Search ---
async function searchPubMed(query, offset = 0, limit = 10) {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retstart=${offset}&retmax=${limit}&retmode=json`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`PubMed API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const pmids = data.esearchresult.idlist || [];
    
    if (pmids.length === 0) {
      return { data: [], total: 0 };
    }
    
    // Get paper details
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`;
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    const papers = [];
    for (const pmid of pmids) {
      const paper = summaryData.result[pmid];
      if (paper && paper.title) {
        papers.push({
          paperId: pmid,
          title: paper.title,
          abstract: paper.abstract || 'Abstract not available',
          authors: paper.authors ? paper.authors.map(a => ({ name: a.name })) : [],
          year: paper.pubdate ? parseInt(paper.pubdate.split(' ')[0]) : null,
          journal: paper.source || 'Unknown Journal',
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          pmid: pmid,
          source: 'PubMed'
        });
      }
    }
    
    return {
      data: papers,
      total: parseInt(data.esearchresult.count) || 0
    };
    
  } catch (error) {
    console.error('PubMed search failed:', error);
    return { data: [], total: 0 };
  }
}

// --- Semantic Scholar API Search ---
async function searchSemanticScholar(query, offset = 0, limit = 10) {
  const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';
  const fields = 'paperId,title,abstract,authors,year,citationCount,influentialCitationCount,fieldsOfStudy,url,venue,publicationDate';
  
  let searchUrl = `${baseUrl}?query=${encodeURIComponent(query)}&fields=${fields}&limit=${limit}&offset=${offset}`;
  
  // Apply filters
  if (currentFilters.year) {
    searchUrl += `&year=${currentFilters.year}`;
  }
  if (currentFilters.field) {
    searchUrl += `&fieldsOfStudy=${encodeURIComponent(currentFilters.field)}`;
  }

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Veridian Research Platform'
      }
    });

    if (!response.ok) {
      throw new Error(`Semantic Scholar API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Add source identifier to each paper
    if (data.data) {
      data.data = data.data.map(paper => ({
        ...paper,
        source: 'Semantic Scholar'
      }));
    }

    // Apply client-side sorting
    if (data.data && currentFilters.sort !== 'relevance') {
      data.data.sort((a, b) => {
        switch (currentFilters.sort) {
          case 'citationCount':
            return (b.citationCount || 0) - (a.citationCount || 0);
          case 'publicationDate':
            return (b.year || 0) - (a.year || 0);
          case 'influentialCitationCount':
            return (b.influentialCitationCount || 0) - (a.influentialCitationCount || 0);
          default:
            return 0;
        }
      });
    }

    return data;
    
  } catch (error) {
    console.error('Semantic Scholar search failed:', error);
    return { data: [], total: 0 };
  }
}

// --- Combine Search Results ---
function combineSearchResults(pubmedResults, scholarResults, limit) {
  const pubmedPapers = pubmedResults.data || [];
  const scholarPapers = scholarResults.data || [];
  
  // Combine papers
  let allPapers = [...pubmedPapers, ...scholarPapers];
  
  // Simple deduplication by title similarity
  const uniquePapers = [];
  for (const paper of allPapers) {
    const isDuplicate = uniquePapers.some(existing => 
      titleSimilarity(paper.title, existing.title) > 0.8
    );
    if (!isDuplicate) {
      uniquePapers.push(paper);
    }
  }
  
  // Limit results
  const finalPapers = uniquePapers.slice(0, limit);
  
  return {
    papers: finalPapers,
    totalFound: pubmedResults.total + scholarResults.total,
    pubmedCount: pubmedPapers.length,
    scholarCount: scholarPapers.length,
    sources: ['PubMed', 'Semantic Scholar']
  };
}

// --- Helper Functions ---
function titleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  const words1 = title1.toLowerCase().split(/\s+/);
  const words2 = title2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  return intersection.length / Math.max(words1.length, words2.length);
}

function calculateSearchQuality(results, query) {
  const paperCount = results.papers ? results.papers.length : 0;
  const hasResults = paperCount > 0;
  const diverseSources = results.sources ? results.sources.length > 1 : false;
  
  // Basic quality scoring based on result availability and diversity
  let confidence = 0.5; // Base confidence
  if (hasResults) confidence += 0.3;
  if (diverseSources) confidence += 0.2;
  if (paperCount > 5) confidence += 0.1;
  
  const accuracy = hasResults ? Math.min(paperCount / 10, 1.0) : 0;
  
  return {
    confidence: Math.min(confidence, 1.0),
    accuracy: accuracy
  };
}

// --- UI Functions ---
function displayState(state) {
  const states = ['loading', 'error', 'no-results', 'results-list'];
  states.forEach(s => {
    const element = document.getElementById(s);
    if (element) {
      element.style.display = 'none';
    }
  });

  const activeElement = document.getElementById(state);
  if (activeElement) {
    activeElement.style.display = (state === 'results-list' ? 'flex' : 'block');
  }
}

function createPaperCard(paper, index) {
  const card = document.createElement('article');
  card.className = 'paper-card animate-on-scroll fade-up';
  card.style.animationDelay = `${index * 0.1}s`;

  const authors = paper.authors?.map(a => a.name || a).slice(0, 3).join(', ') || 'Unknown Authors';
  const remainingAuthors = paper.authors?.length > 3 ? ` and ${paper.authors.length - 3} others` : '';
  const abstract = paper.abstract ? 
    (paper.abstract.length > 300 ? paper.abstract.substring(0, 300) + '...' : paper.abstract) : 
    'No abstract available for this paper.';

  const venue = paper.venue || 'Unknown Venue';
  const year = paper.year || 'Unknown Year';
  const citations = paper.citationCount || 0;
  const influentialCitations = paper.influentialCitationCount || 0;
  const fieldsOfStudy = paper.fieldsOfStudy?.slice(0, 3).join(', ') || 'General';
  const paperUrl = paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`;
  
  // ML Score indicator
  const mlScore = paper.mlScore || paper.confidence;
  const mlScoreHtml = mlScore ? `
    <div class="ml-score-indicator" style="
      position: absolute;
      top: 8px;
      right: 16px;
      background: ${mlScore > 0.8 ? '#10b981' : mlScore > 0.6 ? '#f59e0b' : '#6b7280'};
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    ">
      ${Math.round(mlScore * 100)}% Match
    </div>
  ` : '';

  card.innerHTML = `
    <div style="position: relative;">
      ${mlScoreHtml}
      <div class="paper-title">
        <a href="${paperUrl}" target="_blank" rel="noopener noreferrer">${paper.title || 'Untitled Paper'}</a>
      </div>
    </div>
    
    <div class="paper-meta">
      <span title="Authors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        ${authors}${remainingAuthors}
      </span>
      
      <span title="Publication Year">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        ${year}
      </span>
      
      <span title="Venue">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
        </svg>
        ${venue}
      </span>
    </div>
    
    <div class="paper-abstract">
      ${abstract}
    </div>
    
    <div class="paper-footer">
      <span title="Citations">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 7h10v10"></path>
          <path d="M7 17L17 7"></path>
        </svg>
        ${citations ? citations.toLocaleString() : 'N/A'} citations
      </span>
      
      ${influentialCitations ? `
        <span title="Influential Citations">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
          </svg>
          ${influentialCitations} influential
        </span>
      ` : ''}
      
      <span title="Fields of Study">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6"></path>
        </svg>
        ${fieldsOfStudy}
      </span>
    </div>
  `;
  
  return card;
}

async function performSearch(query, isNewSearch = true, showLoadingState = true) {
  console.log('🚀 [DEBUG] performSearch called:', query, isNewSearch, showLoadingState);
  
  if (isLoading) {
    console.log('🚀 [DEBUG] Search already in progress, returning');
    return;
  }
  
  isLoading = true;
  
  if (isNewSearch) {
    currentQuery = query;
    currentOffset = 0;
    hasMoreResults = true;
    if (elements.resultsList) elements.resultsList.innerHTML = '';
    if (elements.loadMoreBtn) elements.loadMoreBtn.style.display = 'none';
    
    if (query.trim()) {
      updateSearchHistory(query.trim());
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('q', query.trim());
      window.history.pushState({}, '', newUrl);
    }
  }

  if (!query.trim()) {
    displayState('no-results');
    if (elements.searchTitle) elements.searchTitle.textContent = 'Enter a search term to begin';
    if (elements.searchSubtitle) elements.searchSubtitle.textContent = 'Search millions of academic papers and research articles';
    isLoading = false;
    return;
  }

  if (showLoadingState && isNewSearch) {
    displayState('loading');
    if (elements.searchTitle) {
      elements.searchTitle.innerHTML = `Searching for "${query}"... <span style="color: #10b981; font-size: 0.8em;">AI Enhanced</span>`;
    }
    if (elements.searchSubtitle) {
      elements.searchSubtitle.textContent = 'AI is analyzing your query and finding the most relevant papers';
    }
  }

  try {
    const data = await searchPapers(query, currentOffset);
    
    if (data.data && data.data.length > 0) {
      displayState('results-list');
      
      const papers = data.data;
      
      papers.forEach((paper, index) => {
        const card = createPaperCard(paper, currentOffset + index);
        if (elements.resultsList) {
          elements.resultsList.appendChild(card);
        }
        
        // Animate card
        setTimeout(() => {
          card.classList.add('is-visible');
        }, index * 100);
      });

      // Update search status
      const mlIndicator = data.mlEnhanced ? 
        '<span style="color: #10b981; font-size: 0.8em; margin-left: 8px;">AI Enhanced</span>' : '';
      
      if (elements.searchTitle) {
        elements.searchTitle.innerHTML = `Results for "${query}" ${mlIndicator}`;
      }
      
      const totalResults = data.total ? data.total.toLocaleString() : 'many';
      const currentCount = currentOffset + papers.length;
      
      if (elements.resultsInfo) {
        elements.resultsInfo.textContent = `Showing ${currentCount.toLocaleString()} of ${totalResults} papers`;
        elements.resultsInfo.style.display = 'inline-block';
      }
      
      if (elements.searchSubtitle) {
        elements.searchSubtitle.textContent = `Found ${totalResults} relevant research papers`;
      }
      
      // Display ML insights if available
      if (data.mlEnhanced && data.explanation) {
        displayMLInsights(data, query);
      }

      currentOffset += papers.length;
      hasMoreResults = data.total ? (data.total > currentOffset) : papers.length >= 10;
      
      if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = hasMoreResults ? 'block' : 'none';
      }
      
    } else if (currentOffset === 0) {
      displayState('no-results');
      if (elements.searchTitle) elements.searchTitle.textContent = `No results for "${query}"`;
      if (elements.searchSubtitle) elements.searchSubtitle.textContent = 'Try different keywords or adjust your filters';
      
      showMeSHSuggestions();
    }
    
  } catch (error) {
    console.error('Search error:', error);
    displayState('error');
    if (elements.searchTitle) elements.searchTitle.textContent = `Search failed for "${query}"`;
    if (elements.searchSubtitle) elements.searchSubtitle.textContent = 'Please check your connection and try again';
    if (elements.errorMessage) elements.errorMessage.textContent = error.message || 'Unknown error occurred';
    
  } finally {
    isLoading = false;
  }
}

function displayMLInsights(data, query) {
  // Remove existing insights
  const existingInsights = document.getElementById('ml-insights-panel');
  if (existingInsights) {
    existingInsights.remove();
  }
  
  const insightsPanel = document.createElement('div');
  insightsPanel.id = 'ml-insights-panel';
  insightsPanel.style.cssText = `
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 2px solid #10b981;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    position: relative;
  `;
  
  insightsPanel.innerHTML = `
    <h4 style="color: #10b981; margin: 0 0 16px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
      AI Search Enhancement Applied
    </h4>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
      <div>
        <strong>Search Confidence:</strong>
        <div style="display: flex; align-items: center; margin-top: 4px;">
          <span style="margin-right: 8px;">${Math.round((data.confidence || 0.5) * 100)}%</span>
          <div style="width: 100px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; background: linear-gradient(90deg, #10b981, #059669); width: ${(data.confidence || 0.5) * 100}%; transition: width 0.8s ease;"></div>
          </div>
        </div>
      </div>
      
      <div>
        <strong>Response Time:</strong>
        <div style="margin-top: 4px; color: #059669;">${data.responseTime || 0}ms</div>
      </div>
      
      <div>
        <strong>Results Found:</strong>
        <div style="margin-top: 4px; color: #059669;">${(data.total || 0).toLocaleString()}</div>
      </div>
    </div>
    
    ${data.explanation && data.explanation.length > 0 ? `
      <div>
        <strong>AI Enhancements Applied:</strong>
        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
          ${data.explanation.map(exp => `
            <span style="
              background: rgba(16, 185, 129, 0.1); 
              color: #059669; 
              padding: 4px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: 600;
              border: 1px solid rgba(16, 185, 129, 0.3);
            ">${exp}</span>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  
  // Insert after search status
  const searchStatus = document.getElementById('search-status');
  if (searchStatus && searchStatus.parentNode) {
    searchStatus.parentNode.insertBefore(insightsPanel, searchStatus.nextSibling);
  }
}

function showMeSHSuggestions() {
  if (elements.meshSuggestionsBar) {
    elements.meshSuggestionsBar.style.display = 'block';
    renderMeSHSuggestions();
  }
}

function renderMeSHSuggestions() {
  if (!elements.meshSuggestionsList) return;
  
  elements.meshSuggestionsList.innerHTML = '';
  
  // Show random subset of 8 suggestions
  const shuffled = [...meshSuggestions].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 8);
  
  selected.forEach(keyword => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mesh-chip';
    chip.textContent = keyword;
    chip.addEventListener('click', () => {
      if (elements.searchInput) {
        elements.searchInput.value = keyword;
        performSearch(keyword, true);
      }
    });
    elements.meshSuggestionsList.appendChild(chip);
  });
}

function updateSearchHistory(query) {
  if (!searchHistory.includes(query)) {
    searchHistory.unshift(query);
    searchHistory = searchHistory.slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }
}

// --- Analytics Button Updates ---
function updateAnalyticsButton() {
  const metrics = persistentAnalytics.getCalculatedMetrics();
  const button = document.getElementById('analyticsButton');
  const notification = document.getElementById('analyticsNotification');
  
  if (button && notification) {
    const totalSearches = metrics.totalSearches;
    const searchesToday = metrics.searchesToday;
    
    if (searchesToday > 0) {
      notification.textContent = searchesToday;
      notification.style.display = 'block';
      button.classList.add('analytics-pulse');
      button.title = `ML Analytics Dashboard (${searchesToday} searches today, ${totalSearches} total)`;
    } else if (totalSearches > 0) {
      notification.textContent = totalSearches;
      notification.style.display = 'block';
      button.title = `ML Analytics Dashboard (${totalSearches} total searches)`;
    } else {
      notification.style.display = 'none';
      button.classList.remove('analytics-pulse');
      button.title = 'ML Analytics Dashboard';
    }
  }
}

// --- Python Backend Analytics Functions ---
async function recordSearchAnalytics(searchData) {
  console.log('📊 [DEBUG] recordSearchAnalytics called with:', searchData);
  console.log('📊 [DEBUG] useBackendAnalytics:', useBackendAnalytics);
  console.log('📊 [DEBUG] API_BASE_URL:', API_BASE_URL);
  
  if (useBackendAnalytics) {
    try {
      console.log('📊 [DEBUG] Sending request to backend...');
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData)
      });
      
      console.log('📊 [DEBUG] Response status:', response.status);
      console.log('📊 [DEBUG] Response ok:', response.ok);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Analytics recorded via backend:', result.data.id);
          updateAnalyticsButton();
          return result.data;
        }
      }
      
      throw new Error(`Backend analytics failed: ${response.status}`);
      
    } catch (error) {
      console.warn('⚠️ Backend analytics failed, using local fallback:', error);
      useBackendAnalytics = false; // Disable for session
    }
  }
  
  // Fallback to local analytics
  console.log('📊 Recording analytics locally...');
  const analyticsRecord = persistentAnalytics.recordSearch(searchData);
  
  if (analyticsRecord) {
    console.log('✅ Analytics recorded locally:', analyticsRecord.id);
    updateAnalyticsButton();
    return analyticsRecord;
  } else {
    console.error('❌ Failed to record analytics locally');
    return null;
  }
}

async function getAnalyticsSummary() {
  if (useBackendAnalytics) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/summary`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn('Backend analytics summary failed, using local:', error);
    }
  }
  
  // Fallback to local analytics
  return persistentAnalytics.getCalculatedMetrics();
}

// --- Debug Function ---
function debugAnalytics() {
  const summary = persistentAnalytics.getDataSummary();
  console.log('🔍 Analytics Debug Summary:', summary);
  return summary;
}

// Make functions available globally
window.debugAnalytics = debugAnalytics;
window.getAnalyticsSummary = getAnalyticsSummary;
window.recordSearchAnalytics = recordSearchAnalytics;

// --- Initialize when DOM is ready ---
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Enhanced Search Results Page with Persistent Analytics loading...');
  
  // Initialize DOM elements
  Object.keys(elements).forEach(key => {
    const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
    if (!element) {
      // Handle special cases
      switch(key) {
        case 'searchInput':
          elements[key] = document.getElementById('search-input');
          break;
        case 'searchBtn':
          elements[key] = document.getElementById('search-btn');
          break;
        case 'filterBtn':
          elements[key] = document.getElementById('filter-btn');
          break;
        case 'filtersPanel':
          elements[key] = document.getElementById('filters-panel');
          break;
        case 'searchTitle':
          elements[key] = document.getElementById('search-title');
          break;
        case 'searchSubtitle':
          elements[key] = document.getElementById('search-subtitle');
          break;
        case 'resultsInfo':
          elements[key] = document.getElementById('results-info');
          break;
        case 'noResults':
          elements[key] = document.getElementById('no-results');
          break;
        case 'resultsList':
          elements[key] = document.getElementById('results-list');
          break;
        case 'loadMoreBtn':
          elements[key] = document.getElementById('load-more-btn');
          break;
        case 'retryBtn':
          elements[key] = document.getElementById('retry-btn');
          break;
        case 'applyFiltersBtn':
          elements[key] = document.getElementById('apply-filters');
          break;
        case 'yearFilter':
          elements[key] = document.getElementById('year-filter');
          break;
        case 'fieldFilter':
          elements[key] = document.getElementById('field-filter');
          break;
        case 'sortFilter':
          elements[key] = document.getElementById('sort-filter');
          break;
        case 'errorMessage':
          elements[key] = document.getElementById('error-message');
          break;
        case 'meshSuggestionsBar':
          elements[key] = document.getElementById('mesh-suggestions-bar');
          break;
        case 'meshSuggestionsList':
          elements[key] = document.getElementById('mesh-suggestions-list');
          break;
        default:
          elements[key] = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    } else {
      elements[key] = element;
    }
  });

  // ML systems disabled - using hybrid PubMed + Semantic Scholar search with analytics
  console.log('📚 Using hybrid PubMed + Semantic Scholar search with performance analytics');
  enhancedPubMedSearch = null;
  mlQueryProcessor = null;

  // Initialize analytics button updates
  updateAnalyticsButton();
  setInterval(updateAnalyticsButton, 10000); // Update every 10 seconds

  // Get query from URL and perform search
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  
  if (query && elements.searchInput) {
    elements.searchInput.value = query;
    performSearch(query, true);
  }

  // Set up event listeners
  if (elements.searchBtn && elements.searchInput) {
    elements.searchBtn.addEventListener('click', () => {
      const query = elements.searchInput.value.trim();
      if (query) {
        performSearch(query, true);
      }
    });
    
    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = elements.searchInput.value.trim();
        if (query) {
          performSearch(query, true);
        }
      }
    });
  }

  // Load more button
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.addEventListener('click', () => {
      if (hasMoreResults && !isLoading && currentQuery) {
        performSearch(currentQuery, false, false);
      }
    });
  }

  // Filter handling
  if (elements.filterBtn && elements.filtersPanel) {
    elements.filterBtn.addEventListener('click', () => {
      elements.filtersPanel.classList.toggle('active');
    });
  }

  if (elements.applyFiltersBtn) {
    elements.applyFiltersBtn.addEventListener('click', () => {
      // Update filters
      if (elements.yearFilter) currentFilters.year = elements.yearFilter.value;
      if (elements.fieldFilter) currentFilters.field = elements.fieldFilter.value;
      if (elements.sortFilter) currentFilters.sort = elements.sortFilter.value;
      
      // Re-run search with filters
      if (currentQuery) {
        performSearch(currentQuery, true);
      }
      
      // Hide filter panel
      if (elements.filtersPanel) elements.filtersPanel.classList.remove('active');
    });
  }

  // Retry button
  if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', () => {
      if (currentQuery) {
        performSearch(currentQuery, true);
      }
    });
  }

  // Back to top button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.style.display = 'none';
        backToTopBtn.classList.remove('show');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Initialize MeSH suggestions
  renderMeSHSuggestions();

  // Debug: Show current analytics data
  console.log('📊 Current Analytics Data:', debugAnalytics());

  console.log('✅ Enhanced Search Results Page with Persistent Analytics initialized');
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .paper-card {
    transition: all 0.3s ease;
  }

  .paper-card.is-visible {
    animation: fadeInUp 0.6s ease-out;
  }

  .back-to-top.show {
    opacity: 1;
    transform: translateY(0);
  }

  .back-to-top {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  }

  .analytics-pulse {
    animation: analyticsPulse 2s infinite;
  }

  @keyframes analyticsPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }
`;
document.head.appendChild(style);

console.log('✅ Persistent Search Analytics Script loaded');

// Make analytics functions available globally
window.recordSearchAnalytics = (data) => persistentAnalytics.recordSearch(data);
window.getSearchAnalytics = () => persistentAnalytics.getSearchHistory();
window.getAnalyticsSummary = () => persistentAnalytics.getCalculatedMetrics();