//===============================================
// ENHANCED PUBMED API INTEGRATION WITH ML
//===============================================

// Enhanced PubMed API handler with Python backend
class EnhancedPubMedSearch {
  constructor(apiBaseUrl = 'http://127.0.0.1:5000') {
    this.apiBaseUrl = apiBaseUrl;
    this.baseURL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    this.mlProcessor = new MLQueryProcessor(apiBaseUrl);
    this.searchCache = new Map();
    this.apiKey = null; // Add your NCBI API key for better rate limits
    this.useBackend = false; // DISABLED: Use real PubMed APIs instead of mock backend
  }

  // Main search function - now uses Python backend API
  async searchPapers(query, offset = 0, limit = 20, filters = {}) {
    // Try Python backend first if enabled
    if (this.useBackend) {
      try {
        console.log('🚀 Using Python backend for enhanced PubMed search:', query);
        
        const response = await fetch(`${this.apiBaseUrl}/api/search/enhanced`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            offset,
            limit,
            api_key: this.apiKey,
            filters,
            record_analytics: true
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Enhanced search completed via Python backend');
            return {
              papers: result.data.papers || [],
              total: result.data.total || 0,
              mlEnhanced: result.data.ml_enhanced || false,
              confidence: result.data.confidence || 0.5,
              explanation: result.data.explanation || [],
              responseTime: result.data.response_time
            };
          }
        }
        
        throw new Error(`Backend API failed: ${response.status}`);
        
      } catch (backendError) {
        console.warn('⚠️ Python backend failed, falling back to local processing:', backendError);
        this.useBackend = false; // Disable backend for subsequent requests
      }
    }
    
    // Fallback to local processing
    return await this.localSearchFallback(query, offset, limit, filters);
  }
  
  // Local search fallback when Python backend is unavailable
  async localSearchFallback(query, offset = 0, limit = 20, filters = {}) {
    try {
      console.log('🔧 Using local enhanced PubMed search for:', query);
      
      // Process query with ML enhancements (local fallback)
      const mlParams = await this.mlProcessor.processQuery(query, {
        offset,
        limit,
        filters,
        timestamp: new Date()
      });

      console.log('🤖 ML Enhanced Parameters (local):', mlParams);

      // Build PubMed search query
      const pubmedQuery = this.buildPubMedQuery(mlParams, query);
      console.log('📚 Final PubMed Query:', pubmedQuery);

      // Search PubMed using eSearch
      const searchResults = await this.performESearch(pubmedQuery, offset, limit);
      
      if (searchResults.idlist && searchResults.idlist.length > 0) {
        // Fetch detailed paper information using eSummary and eFetch
        const papers = await this.fetchPaperDetails(searchResults.idlist);
        
        // Apply ML-based ranking and filtering
        const rankedPapers = this.applyMLRanking(papers, mlParams, query);
        
        console.log('📊 [PubMed] About to record analytics. Papers found:', rankedPapers.length);
        
        // Store search analytics
        await this.logSearchAnalytics(query, mlParams, rankedPapers.length);
        
        console.log('📊 [PubMed] Analytics recording completed');
        
        return {
          papers: rankedPapers,
          total: searchResults.count,
          mlEnhanced: true,
          confidence: mlParams.confidence,
          explanation: mlParams.explanation
        };
      } else {
        // Try fallback search with original query
        return await this.fallbackSearch(query, offset, limit);
      }
    } catch (error) {
      console.error('Local enhanced search failed:', error);
      return await this.fallbackSearch(query, offset, limit);
    }
  }

  // Build optimized PubMed query from ML parameters
  buildPubMedQuery(mlParams, originalQuery) {
    let queryParts = [];

    // Use ML-enhanced query if available
    if (mlParams.query) {
      queryParts.push(mlParams.query);
    } else {
      // Fallback to original query with basic enhancements
      queryParts.push(`(${originalQuery}[Title/Abstract])`);
    }

    // Add filters based on ML analysis (with safety checks)
    if (mlParams.advanced && mlParams.advanced.studyTypes && mlParams.advanced.studyTypes.length > 0) {
      const studyTypeFilter = mlParams.advanced.studyTypes
        .map(st => `"${st}"[Publication Type]`)
        .join(' OR ');
      queryParts.push(`AND (${studyTypeFilter})`);
    }

    // Add date range if specified
    if (mlParams.advanced && mlParams.advanced.dateRange) {
      const startDate = mlParams.advanced.dateRange.start;
      if (startDate) {
        const year = startDate.getFullYear();
        queryParts.push(`AND ${year}:3000[Date - Publication]`);
      }
    }

    // Add language filter
    if (mlParams.advanced && mlParams.advanced.languages && mlParams.advanced.languages.includes('eng')) {
      queryParts.push('AND "english"[Language]');
    }

    console.log('📚 [PubMed] Built query:', queryParts.join(' '));

    return queryParts.join(' ');
  }

  // Perform eSearch API call
  async performESearch(query, offset, limit) {
    const url = new URL(this.baseURL + 'esearch.fcgi');
    url.searchParams.set('db', 'pubmed');
    url.searchParams.set('term', query);
    url.searchParams.set('retstart', offset);
    url.searchParams.set('retmax', limit);
    url.searchParams.set('retmode', 'json');
    url.searchParams.set('sort', 'relevance');
    
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`PubMed eSearch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.esearchresult;
  }

  // Fetch detailed paper information
  async fetchPaperDetails(pmids) {
    if (!pmids || pmids.length === 0) return [];

    // Use eSummary for basic info
    const summaryUrl = new URL(this.baseURL + 'esummary.fcgi');
    summaryUrl.searchParams.set('db', 'pubmed');
    summaryUrl.searchParams.set('id', pmids.join(','));
    summaryUrl.searchParams.set('retmode', 'json');
    
    if (this.apiKey) {
      summaryUrl.searchParams.set('api_key', this.apiKey);
    }

    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      throw new Error(`PubMed eSummary failed: ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    const papers = [];

    // Process each paper summary
    for (const [pmid, summary] of Object.entries(summaryData.result)) {
      if (pmid === 'uids') continue;

      try {
        const paper = this.processPaperSummary(pmid, summary);
        if (paper) papers.push(paper);
      } catch (error) {
        console.warn(`Error processing paper ${pmid}:`, error);
      }
    }

    // If some papers lack abstracts, try fetching full abstracts via efetch (lazy fallback)
    const missingPmids = papers
      .filter(p => !p.abstract || p.abstract === 'No abstract available')
      .map(p => p.pmid);

    if (missingPmids.length > 0) {
      try {
        const fetched = await this.fetchAbstracts(missingPmids);
        // Merge fetched abstracts back into papers
        papers.forEach(p => {
          if ((!p.abstract || p.abstract === 'No abstract available') && fetched[p.pmid]) {
            p.abstract = fetched[p.pmid];
          }
        });
      } catch (err) {
        console.warn('efetch fallback failed:', err);
      }
    }

    return papers;
  }

  // Fetch full abstracts using efetch.fcgi (XML) and parse AbstractText
  async fetchAbstracts(pmids) {
    const result = {};
    if (!pmids || pmids.length === 0) return result;

    const fetchUrl = new URL(this.baseURL + 'efetch.fcgi');
    fetchUrl.searchParams.set('db', 'pubmed');
    fetchUrl.searchParams.set('id', pmids.join(','));
    fetchUrl.searchParams.set('retmode', 'xml');

    if (this.apiKey) {
      fetchUrl.searchParams.set('api_key', this.apiKey);
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`PubMed eFetch failed: ${response.status}`);
    }

    const text = await response.text();
    // Parse XML and extract AbstractText nodes
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'application/xml');
      const articles = xml.querySelectorAll('PubmedArticle');
      articles.forEach(article => {
        try {
          const pmidNode = article.querySelector('MedlineCitation > PMCID, MedlineCitation > PMID');
          // Prefer PMID
          let pmid = null;
          const pmidElem = article.querySelector('MedlineCitation > PMID');
          if (pmidElem && pmidElem.textContent) pmid = pmidElem.textContent.trim();

          if (!pmid) return;

          const abstractTexts = article.querySelectorAll('Abstract > AbstractText');
          if (abstractTexts && abstractTexts.length > 0) {
            // Concatenate multiple AbstractText nodes (may have labels/sections)
            const parts = [];
            abstractTexts.forEach(node => {
              // If node has Label attribute, include it
              const label = node.getAttribute('Label');
              const section = node.textContent ? node.textContent.trim() : '';
              parts.push(label ? `${label}: ${section}` : section);
            });
            result[pmid] = parts.join('\n\n');
          }
        } catch (e) {
          // ignore per-article parse errors
        }
      });
    } catch (e) {
      console.warn('Error parsing efetch XML:', e);
    }

    return result;
  }

  // Process individual paper summary into standardized format
  processPaperSummary(pmid, summary) {
    if (!summary || summary.error) return null;

    return {
      paperId: `pubmed_${pmid}`,
      pmid: pmid,
      title: summary.title || 'Untitled',
      abstract: summary.abstract || 'No abstract available',
      authors: this.processAuthors(summary.authors),
      year: summary.pubdate ? new Date(summary.pubdate).getFullYear() : null,
      journal: summary.source || 'Unknown Journal',
      venue: summary.source || 'Unknown Venue',
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      citationCount: null, // Not available in PubMed API
      influentialCitationCount: null,
      fieldsOfStudy: this.extractFieldsOfStudy(summary),
      publicationDate: summary.pubdate || null,
      publicationTypes: summary.pubtype || [],
      doi: summary.articleids ? this.extractDOI(summary.articleids) : null,
      keywords: this.extractKeywords(summary),
      meshTerms: this.extractMeSHTerms(summary),
      isOpenAccess: this.checkOpenAccess(summary)
    };
  }

  // Process author information
  processAuthors(authors) {
    if (!authors || !Array.isArray(authors)) return [];
    
    return authors.slice(0, 10).map(author => ({
      name: author.name || 'Unknown Author',
      affiliation: author.affiliation || null
    }));
  }

  // Extract fields of study from PubMed categories
  extractFieldsOfStudy(summary) {
    const fields = [];
    
    // Extract from MeSH terms or publication types
    if (summary.pubtype) {
      summary.pubtype.forEach(type => {
        if (type.includes('Clinical Trial')) fields.push('Medicine');
        if (type.includes('Review')) fields.push('Literature Review');
      });
    }
    
    // Add default field if none found
    if (fields.length === 0) {
      fields.push('Medicine');
    }
    
    return fields;
  }

  // Extract DOI from article IDs
  extractDOI(articleids) {
    if (!articleids || !Array.isArray(articleids)) return null;
    
    const doiEntry = articleids.find(id => id.idtype === 'doi');
    return doiEntry ? doiEntry.value : null;
  }

  // Extract keywords from summary
  extractKeywords(summary) {
    const keywords = [];
    
    // Extract from title (simplified approach)
    if (summary.title) {
      const titleWords = summary.title.toLowerCase()
        .split(/[^\w]+/)
        .filter(word => word.length > 4);
      keywords.push(...titleWords.slice(0, 5));
    }
    
    return keywords;
  }

  // Extract MeSH terms
  extractMeSHTerms(summary) {
    // This would require additional eFetch call to get full record
    // For now, return empty array
    return [];
  }

  // Check if paper is open access
  checkOpenAccess(summary) {
    // Simplified check - would need more sophisticated detection
    return false;
  }

  // Apply ML-based ranking and filtering
  applyMLRanking(papers, mlParams, originalQuery) {
    // Score papers based on ML analysis
    const scoredPapers = papers.map(paper => ({
      ...paper,
      mlScore: this.calculateRelevanceScore(paper, mlParams, originalQuery)
    }));

    // Sort by ML score (descending)
    scoredPapers.sort((a, b) => b.mlScore - a.mlScore);

    return scoredPapers;
  }

  // Calculate relevance score using ML parameters
  calculateRelevanceScore(paper, mlParams, originalQuery) {
    let score = 0.5; // Base score

    // Title relevance
    const titleRelevance = this.calculateTextRelevance(
      paper.title.toLowerCase(),
      originalQuery.toLowerCase(),
      mlParams
    );
    score += titleRelevance * 0.4;

    // Abstract relevance
    const abstractRelevance = this.calculateTextRelevance(
      paper.abstract.toLowerCase(),
      originalQuery.toLowerCase(),
      mlParams
    );
    score += abstractRelevance * 0.3;

    // Recency bonus
    if (paper.year && paper.year >= new Date().getFullYear() - 2) {
      score += 0.1;
    }

    // Publication type bonus
    if (mlParams.advanced && mlParams.advanced.studyTypes && mlParams.advanced.studyTypes.length > 0) {
      const hasPreferredType = paper.publicationTypes.some(type =>
        mlParams.advanced.studyTypes.includes(type.toLowerCase())
      );
      if (hasPreferredType) score += 0.2;
    }

    return Math.min(score, 1);
  }

  // Calculate text relevance using simple matching
  calculateTextRelevance(text, query, mlParams) {
    let relevance = 0;

    // Exact phrase matching
    if (text.includes(query)) {
      relevance += 0.8;
    }

    // Individual word matching
    const queryWords = query.split(/\s+/);
    const matchedWords = queryWords.filter(word => 
      word.length > 2 && text.includes(word)
    );
    relevance += (matchedWords.length / queryWords.length) * 0.6;

    // MeSH term bonus
    if (mlParams.focus?.primary) {
      const meshTerm = mlParams.focus.primary.toLowerCase();
      if (text.includes(meshTerm)) {
        relevance += 0.3;
      }
    }

    return Math.min(relevance, 1);
  }

  // Fallback search for when ML processing fails
  async fallbackSearch(query, offset, limit) {
    console.log('Using fallback search for:', query);
    
    const simpleQuery = `"${query}"[Title/Abstract]`;
    const searchResults = await this.performESearch(simpleQuery, offset, limit);
    
    if (searchResults.idlist && searchResults.idlist.length > 0) {
      const papers = await this.fetchPaperDetails(searchResults.idlist);
      return {
        papers,
        total: searchResults.count,
        mlEnhanced: false,
        confidence: 0.3,
        explanation: ['Using basic keyword search']
      };
    }
    
    return { papers: [], total: 0, mlEnhanced: false, confidence: 0 };
  }

  // Log search analytics for improving ML model
  async logSearchAnalytics(query, mlParams, resultCount) {
    console.log('📊 [PubMed] Recording analytics for:', query);
    
    const analyticsData = {
      query: query,
      mlEnhanced: true,
      responseTime: mlParams.responseTime || 0,
      confidence: mlParams.confidence || 0.5,
      resultCount: resultCount,
      status: 'success',
      explanation: mlParams.explanation || ['PubMed enhanced search'],
      searchType: 'new_search',
      filters: {}
    };
    
    // Use the main analytics recording function from search-results.js
    if (typeof window.recordSearchAnalytics === 'function') {
      try {
        await window.recordSearchAnalytics(analyticsData);
        console.log('✅ [PubMed] Analytics recorded via backend');
      } catch (error) {
        console.error('❌ [PubMed] Analytics recording failed:', error);
        // Fallback to localStorage
        this.storeAnalyticsLocally(query, mlParams, resultCount);
      }
    } else {
      console.warn('⚠️ [PubMed] recordSearchAnalytics function not available, using localStorage');
      this.storeAnalyticsLocally(query, mlParams, resultCount);
    }
  }
  
  // Fallback localStorage storage
  storeAnalyticsLocally(query, mlParams, resultCount) {
    const analytics = {
      query,
      timestamp: new Date().toISOString(),
      mlParams: {
        confidence: mlParams.confidence,
        intent: mlParams.intent,
        focus: mlParams.focus
      },
      resultCount,
      enhanced: true
    };

    const existing = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    existing.push(analytics);
    
    // Keep only last 1000 entries
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }
    
    localStorage.setItem('searchAnalytics', JSON.stringify(existing));
  }

  // Get search suggestions with ML enhancement
  async getSearchSuggestions(partialQuery) {
    const suggestions = await this.mlProcessor.getSearchSuggestions(partialQuery);
    
    // Add trending searches from analytics
    const analytics = JSON.parse(localStorage.getItem('searchAnalytics') || '[]');
    const recent = analytics.slice(-50);
    const trending = this.extractTrendingTerms(recent);
    
    trending.forEach(term => {
      if (term.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push({
          text: term,
          type: 'trending',
          description: 'Trending search',
          confidence: 0.7
        });
      }
    });
    
    return suggestions.slice(0, 8);
  }

  // Extract trending terms from search analytics
  extractTrendingTerms(analytics) {
    const termCounts = {};
    
    analytics.forEach(entry => {
      const words = entry.query.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          termCounts[word] = (termCounts[word] || 0) + 1;
        }
      });
    });
    
    return Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);
  }
}

//===============================================
// INTEGRATION WITH EXISTING SEARCH SYSTEM
//===============================================

// Function to seamlessly replace the existing search functionality
function integrateEnhancedPubMedSearch() {
  console.log('🚀 Integrating Enhanced PubMed Search with ML...');
  
  // Initialize the enhanced search system
  const enhancedSearch = new EnhancedPubMedSearch();
  
  // Replace the existing searchPapers function
  if (typeof window.searchPapers === 'function') {
    window.originalSearchPapers = window.searchPapers; // Keep backup
  }
  
  window.searchPapers = async function(query, offset = 0, limit = 10) {
    try {
      const result = await enhancedSearch.searchPapers(query, offset, limit);
      return {
        data: result.papers,
        total: result.total,
        mlEnhanced: result.mlEnhanced,
        confidence: result.confidence,
        explanation: result.explanation
      };
    } catch (error) {
      console.error('Enhanced search failed, using fallback:', error);
      // Use original function if available
      if (window.originalSearchPapers) {
        return await window.originalSearchPapers(query, offset, limit);
      }
      throw error;
    }
  };

  // Enhance the search input with autocomplete
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length > 2) {
          try {
            const suggestions = await enhancedSearch.getSearchSuggestions(query);
            displaySearchSuggestions(suggestions, searchInput);
          } catch (error) {
            console.warn('Failed to get search suggestions:', error);
          }
        } else {
          hideSearchSuggestions();
        }
      }, 300);
    });
  }

  // Add ML insights to search results display
  const originalDisplayResults = window.displaySearchResults;
  if (originalDisplayResults) {
    window.displaySearchResults = function(results, query) {
      // Call original display function
      originalDisplayResults(results, query);
      
      // Add ML insights if available
      if (results.mlEnhanced) {
        displayMLInsights(results, query);
      }
    };
  }

  console.log('✅ Enhanced PubMed Search integration complete!');
}

// Display search suggestions dropdown
function displaySearchSuggestions(suggestions, inputElement) {
  // Remove existing suggestions
  hideSearchSuggestions();
  
  if (suggestions.length === 0) return;
  
  const dropdown = document.createElement('div');
  dropdown.id = 'search-suggestions';
  dropdown.className = 'search-suggestions-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  suggestions.forEach((suggestion, index) => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.style.cssText = `
      padding: var(--space-12) var(--space-16);
      cursor: pointer;
      border-bottom: 1px solid var(--color-border);
      transition: background-color var(--duration-fast) ease;
    `;
    
    item.innerHTML = `
      <div style="font-weight: var(--font-weight-medium); color: var(--color-text);">
        ${suggestion.text}
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--space-4);">
        ${suggestion.description} ${suggestion.type === 'mesh' ? '(MeSH)' : ''}
      </div>
    `;
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--color-secondary)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    item.addEventListener('click', () => {
      inputElement.value = suggestion.text;
      hideSearchSuggestions();
      // Trigger search
      if (window.performSearch) {
        window.performSearch(suggestion.text, true);
      }
    });
    
    dropdown.appendChild(item);
  });
  
  // Position relative to input
  const container = inputElement.closest('.search-container');
  if (container) {
    container.style.position = 'relative';
    container.appendChild(dropdown);
  }
}

// Hide search suggestions
function hideSearchSuggestions() {
  const existing = document.getElementById('search-suggestions');
  if (existing) {
    existing.remove();
  }
}

// Display ML insights panel
function displayMLInsights(results, query) {
  const insightsContainer = document.getElementById('ml-insights') || createMLInsightsContainer();
  
  insightsContainer.innerHTML = `
    <div style="padding: var(--space-16); background: var(--color-bg-1); border-radius: var(--radius-md); margin: var(--space-16) 0;">
      <h4 style="margin: 0 0 var(--space-12) 0; color: var(--color-primary);">
        🤖 AI Search Enhancement
      </h4>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.4;">
        <div><strong>Confidence:</strong> ${Math.round(results.confidence * 100)}%</div>
        ${results.explanation ? `<div style="margin-top: var(--space-8);"><strong>Enhancement:</strong> ${results.explanation.join('; ')}</div>` : ''}
        <div style="margin-top: var(--space-8);"><strong>Total Results:</strong> ${results.total?.toLocaleString() || 'Unknown'}</div>
      </div>
    </div>
  `;
}

// Create ML insights container
function createMLInsightsContainer() {
  const container = document.createElement('div');
  container.id = 'ml-insights';
  
  const searchStatus = document.querySelector('.search-status');
  if (searchStatus) {
    searchStatus.appendChild(container);
  }
  
  return container;
}

// Initialize the integration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', integrateEnhancedPubMedSearch);
} else {
  integrateEnhancedPubMedSearch();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedPubMedSearch, integrateEnhancedPubMedSearch };
} else {
  window.EnhancedPubMedSearch = EnhancedPubMedSearch;
}