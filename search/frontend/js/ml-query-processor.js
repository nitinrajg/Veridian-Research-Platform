//===============================================
// MACHINE LEARNING ENHANCED QUERY PROCESSOR
// NOW USING PYTHON BACKEND API
//===============================================

class MLQueryProcessor {
  constructor(apiBaseUrl = 'http://127.0.0.1:5000') {
    this.apiBaseUrl = apiBaseUrl;
    this.queryHistory = JSON.parse(localStorage.getItem('mlQueryHistory') || '[]');
    this.userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    
    // Keep local fallback data for offline mode
    this.meshTerms = this.initializeMeSHTerms();
    this.medicalAbbreviations = this.initializeMedicalAbbreviations();
    this.synonymMap = this.initializeSynonymMap();
  }

  // Initialize comprehensive MeSH terms database
  initializeMeSHTerms() {
    return {
      // Cardiovascular
      'heart attack': 'Myocardial Infarction',
      'heart disease': 'Heart Diseases',
      'high blood pressure': 'Hypertension',
      'stroke': 'Stroke',
      'cardiac': 'Heart Diseases',
      
      // Endocrine
      'diabetes': 'Diabetes Mellitus',
      'sugar diabetes': 'Diabetes Mellitus',
      'thyroid': 'Thyroid Diseases',
      
      // Respiratory
      'asthma': 'Asthma',
      'lung disease': 'Lung Diseases',
      'pneumonia': 'Pneumonia',
      'copd': 'Pulmonary Disease, Chronic Obstructive',
      
      // Oncology
      'cancer': 'Neoplasms',
      'tumor': 'Neoplasms',
      'breast cancer': 'Breast Neoplasms',
      'lung cancer': 'Lung Neoplasms',
      'skin cancer': 'Skin Neoplasms',
      
      // Neurological
      'alzheimer': 'Alzheimer Disease',
      'dementia': 'Dementia',
      'parkinson': 'Parkinson Disease',
      'epilepsy': 'Epilepsy',
      'seizure': 'Seizures',
      
      // Mental Health
      'depression': 'Depression',
      'anxiety': 'Anxiety Disorders',
      'ptsd': 'Stress Disorders, Post-Traumatic',
      'bipolar': 'Bipolar Disorder',
      
      // Infectious Diseases
      'covid': 'COVID-19',
      'coronavirus': 'COVID-19',
      'hiv': 'HIV Infections',
      'aids': 'Acquired Immunodeficiency Syndrome',
      'tuberculosis': 'Tuberculosis',
      'malaria': 'Malaria',
      
      // Orthopedics
      'arthritis': 'Arthritis',
      'osteoporosis': 'Osteoporosis',
      'joint pain': 'Arthralgia',
      
      // Technology & Methods
      'machine learning': 'Machine Learning',
      'artificial intelligence': 'Artificial Intelligence',
      'deep learning': 'Deep Learning',
      'neural network': 'Neural Networks, Computer',
      'gene therapy': 'Genetic Therapy',
      'immunotherapy': 'Immunotherapy',
      'telemedicine': 'Telemedicine'
    };
  }

  // Initialize medical abbreviations
  initializeMedicalAbbreviations() {
    return {
      'MI': 'Myocardial Infarction',
      'CVD': 'Cardiovascular Diseases',
      'CHF': 'Heart Failure',
      'COPD': 'Pulmonary Disease, Chronic Obstructive',
      'DM': 'Diabetes Mellitus',
      'HTN': 'Hypertension',
      'CAD': 'Coronary Artery Disease',
      'CKD': 'Renal Insufficiency, Chronic',
      'PTSD': 'Stress Disorders, Post-Traumatic',
      'IBD': 'Inflammatory Bowel Diseases',
      'RA': 'Arthritis, Rheumatoid',
      'MS': 'Multiple Sclerosis',
      'ALS': 'Amyotrophic Lateral Sclerosis',
      'AD': 'Alzheimer Disease',
      'PD': 'Parkinson Disease',
      'AIDS': 'Acquired Immunodeficiency Syndrome',
      'HIV': 'HIV Infections',
      'TB': 'Tuberculosis',
      'UTI': 'Urinary Tract Infections',
      'ICU': 'Intensive Care Units',
      'ER': 'Emergency Service, Hospital'
    };
  }

  // Initialize synonym mapping for better query expansion
  initializeSynonymMap() {
    return {
      'treatment': ['therapy', 'intervention', 'management'],
      'prevention': ['prophylaxis', 'preventive', 'preventative'],
      'diagnosis': ['diagnostic', 'screening', 'detection'],
      'symptoms': ['signs', 'manifestations', 'clinical features'],
      'causes': ['etiology', 'pathogenesis', 'risk factors'],
      'elderly': ['aged', 'geriatric', 'older adults'],
      'children': ['pediatric', 'kids', 'youth'],
      'women': ['female', 'maternal'],
      'men': ['male', 'paternal'],
      'medication': ['drug', 'pharmaceutical', 'medicine'],
      'surgery': ['surgical', 'operation', 'procedure'],
      'study': ['research', 'investigation', 'analysis'],
      'effectiveness': ['efficacy', 'outcome', 'results']
    };
  }

  // Main query processing function - now uses Python backend
  async processQuery(userQuery, userContext = {}) {
    console.log('🔍 Processing query with ML enhancements via Python backend:', userQuery);
    
    try {
      // Call Python backend API for ML processing
      const response = await fetch(`${this.apiBaseUrl}/api/ml/process-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          context: userContext
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local user model
        this.updateUserModel(userQuery, userContext);
        
        console.log('✅ ML query processed successfully via Python backend');
        return result.data;
      } else {
        throw new Error(result.error || 'Unknown API error');
      }
      
    } catch (error) {
      console.error('❌ Python backend ML processing failed:', error);
      console.log('🔄 Falling back to local processing...');
      
      // Fallback to local processing if backend is unavailable
      return this.localFallbackProcessing(userQuery, userContext);
    }
  }

  // Normalize and clean the input query
  normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, ' ')  // Remove special characters except hyphens
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
  }

  // Extract medical entities using pattern matching and NLP
  async extractMedicalEntities(query) {
    const entities = {
      meshTerms: [],
      abbreviations: [],
      conditions: [],
      treatments: [],
      demographics: [],
      studyTypes: []
    };

    // Extract MeSH terms
    for (const [term, meshTerm] of Object.entries(this.meshTerms)) {
      if (query.includes(term)) {
        entities.meshTerms.push({
          original: term,
          mesh: meshTerm,
          confidence: 0.9
        });
      }
    }

    // Extract abbreviations
    for (const [abbrev, fullTerm] of Object.entries(this.medicalAbbreviations)) {
      const pattern = new RegExp(`\\b${abbrev}\\b`, 'gi');
      if (pattern.test(query)) {
        entities.abbreviations.push({
          abbreviation: abbrev,
          expanded: fullTerm,
          confidence: 0.85
        });
      }
    }

    // Extract demographic information
    const demographicPatterns = {
      age: /\b(infant|child|adolescent|adult|elderly|aged|geriatric)\b/gi,
      gender: /\b(male|female|men|women|man|woman)\b/gi,
      population: /\b(pregnant|pregnancy|postmenopausal|pediatric)\b/gi
    };

    for (const [type, pattern] of Object.entries(demographicPatterns)) {
      const matches = query.match(pattern);
      if (matches) {
        entities.demographics.push({
          type,
          values: [...new Set(matches.map(m => m.toLowerCase()))],
          confidence: 0.8
        });
      }
    }

    // Extract study types
    const studyTypePatterns = {
      'randomized controlled trial': /\b(rct|randomized controlled trial|clinical trial)\b/gi,
      'meta-analysis': /\b(meta-analysis|systematic review)\b/gi,
      'case study': /\b(case study|case report)\b/gi,
      'cohort study': /\b(cohort study|longitudinal)\b/gi
    };

    for (const [studyType, pattern] of Object.entries(studyTypePatterns)) {
      if (pattern.test(query)) {
        entities.studyTypes.push({
          type: studyType,
          confidence: 0.9
        });
      }
    }

    return entities;
  }

  // Perform semantic analysis using advanced NLP
  async performSemanticAnalysis(query, entities) {
    const analysis = {
      intent: this.classifyIntent(query),
      sentiment: this.analyzeSentiment(query),
      complexity: this.assessComplexity(query, entities),
      focus: this.determineFocus(query, entities),
      synonyms: this.expandWithSynonyms(query),
      relatedTerms: await this.findRelatedTerms(entities)
    };

    return analysis;
  }

  // Classify the search intent
  classifyIntent(query) {
    const intentPatterns = {
      treatment: /\b(treat|therapy|intervention|cure|medication|drug)\b/i,
      diagnosis: /\b(diagnos|detect|screen|test|identify)\b/i,
      prevention: /\b(prevent|avoid|prophylax|vaccination|immuniz)\b/i,
      symptoms: /\b(symptom|sign|manifest|present)\b/i,
      causes: /\b(cause|etiology|pathogen|risk factor)\b/i,
      prognosis: /\b(prognosis|outcome|survival|mortality)\b/i,
      epidemiology: /\b(prevalence|incidence|epidemiol|population)\b/i,
      mechanism: /\b(mechanism|pathway|molecular|cellular)\b/i
    };

    const intents = [];
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(query)) {
        intents.push({
          type: intent,
          confidence: 0.8
        });
      }
    }

    return intents.length > 0 ? intents : [{ type: 'general', confidence: 0.5 }];
  }

  // Analyze sentiment to understand urgency or specificity
  analyzeSentiment(query) {
    const urgencyTerms = /\b(urgent|emergency|acute|severe|critical|immediate)\b/i;
    const uncertaintyTerms = /\b(possible|potential|may|might|could|uncertain)\b/i;
    const specificityTerms = /\b(specific|particular|exact|precise)\b/i;

    return {
      urgency: urgencyTerms.test(query) ? 0.8 : 0.2,
      uncertainty: uncertaintyTerms.test(query) ? 0.7 : 0.3,
      specificity: specificityTerms.test(query) ? 0.9 : 0.5
    };
  }

  // Assess query complexity
  assessComplexity(query, entities) {
    let complexity = 0;
    
    // Word count contributes to complexity
    const wordCount = query.split(' ').length;
    complexity += Math.min(wordCount * 0.1, 1);
    
    // Number of entities
    const entityCount = Object.values(entities).flat().length;
    complexity += Math.min(entityCount * 0.15, 1);
    
    // Boolean operators
    if (/\b(and|or|not)\b/i.test(query)) {
      complexity += 0.3;
    }
    
    return Math.min(complexity, 1);
  }

  // Determine the primary focus of the query
  determineFocus(query, entities) {
    const focus = {
      primary: null,
      secondary: [],
      confidence: 0
    };

    // Check for primary medical conditions
    if (entities.meshTerms.length > 0) {
      focus.primary = entities.meshTerms[0].mesh;
      focus.confidence = 0.9;
    }

    // Add secondary focuses
    entities.meshTerms.slice(1).forEach(term => {
      focus.secondary.push(term.mesh);
    });

    return focus;
  }

  // Expand query with synonyms
  expandWithSynonyms(query) {
    const expanded = [];
    
    for (const [term, synonyms] of Object.entries(this.synonymMap)) {
      if (query.includes(term)) {
        expanded.push({
          original: term,
          synonyms: synonyms,
          relevance: 0.7
        });
      }
    }
    
    return expanded;
  }

  // Find related terms using medical knowledge
  async findRelatedTerms(entities) {
    const related = [];
    
    // For each MeSH term, find related terms
    for (const entity of entities.meshTerms) {
      const relatedTerms = this.getRelatedMeSHTerms(entity.mesh);
      if (relatedTerms.length > 0) {
        related.push({
          primary: entity.mesh,
          related: relatedTerms,
          relevance: 0.6
        });
      }
    }
    
    return related;
  }

  // Get related MeSH terms based on medical relationships
  getRelatedMeSHTerms(meshTerm) {
    const relationships = {
      'Diabetes Mellitus': ['Insulin', 'Glucose', 'Diabetic Complications', 'Metabolic Syndrome'],
      'Hypertension': ['Blood Pressure', 'Cardiovascular Diseases', 'Antihypertensive Agents'],
      'Heart Diseases': ['Myocardial Infarction', 'Heart Failure', 'Coronary Artery Disease'],
      'Neoplasms': ['Oncology', 'Chemotherapy', 'Radiotherapy', 'Carcinogenesis'],
      'Depression': ['Antidepressive Agents', 'Mental Health', 'Anxiety Disorders'],
      'COVID-19': ['SARS-CoV-2', 'Pandemic', 'Vaccines', 'Respiratory Tract Infections']
    };
    
    return relationships[meshTerm] || [];
  }

  // Generate enhanced PubMed search parameters
  async generateSearchParameters(semanticAnalysis, userContext) {
    const params = {
      query: '',
      filters: {},
      sort: 'relevance',
      advanced: {
        meshTerms: [],
        fieldRestrictions: [],
        dateRange: null,
        studyTypes: [],
        languages: ['eng']
      },
      confidence: 0,
      explanation: []
    };

    // Build the main query
    let queryParts = [];
    
    // Add MeSH terms with proper formatting
    semanticAnalysis.focus.primary && queryParts.push(`"${semanticAnalysis.focus.primary}"[MeSH Terms]`);
    
    // Add secondary terms
    semanticAnalysis.focus.secondary.forEach(term => {
      queryParts.push(`"${term}"[MeSH Terms]`);
    });

    // Add synonyms for broader search
    semanticAnalysis.synonyms.forEach(syn => {
      syn.synonyms.forEach(synonym => {
        queryParts.push(`"${synonym}"[Title/Abstract]`);
      });
    });

    // Combine with appropriate Boolean logic
    if (queryParts.length > 1) {
      params.query = queryParts.join(' OR ');
    } else if (queryParts.length === 1) {
      params.query = queryParts[0];
    }

    // Apply filters based on intent
    if (semanticAnalysis.intent.some(i => i.type === 'treatment')) {
      params.filters.publicationType = 'clinical trial,randomized controlled trial';
      params.explanation.push('Focusing on treatment studies');
    }

    // Set date range based on urgency
    if (semanticAnalysis.sentiment.urgency > 0.7) {
      params.advanced.dateRange = { start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }; // Last year
      params.explanation.push('Prioritizing recent publications due to urgency indicators');
    }

    // Adjust sort order based on intent
    if (semanticAnalysis.intent.some(i => i.type === 'epidemiology')) {
      params.sort = 'publication date';
      params.explanation.push('Sorting by date for epidemiological trends');
    }

    // Calculate overall confidence
    params.confidence = this.calculateSearchConfidence(semanticAnalysis);

    return params;
  }

  // Calculate confidence score for the search strategy
  calculateSearchConfidence(analysis) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for recognized medical terms
    if (analysis.focus.primary) confidence += 0.3;
    
    // Higher confidence for clear intent
    if (analysis.intent.length > 0 && analysis.intent[0].confidence > 0.7) {
      confidence += 0.2;
    }
    
    // Lower confidence for high uncertainty
    if (analysis.sentiment.uncertainty > 0.6) {
      confidence -= 0.1;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  // Update user model based on interactions
  updateUserModel(query, context) {
    const interaction = {
      query,
      timestamp: new Date().toISOString(),
      context,
      processed: true
    };
    
    this.queryHistory.push(interaction);
    
    // Keep only last 100 queries
    if (this.queryHistory.length > 100) {
      this.queryHistory = this.queryHistory.slice(-100);
    }
    
    // Update user preferences
    this.analyzeUserPatterns();
    
    // Save to localStorage
    localStorage.setItem('mlQueryHistory', JSON.stringify(this.queryHistory));
    localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
  }

  // Analyze user patterns to improve future searches
  analyzeUserPatterns() {
    if (this.queryHistory.length < 5) return;
    
    const recentQueries = this.queryHistory.slice(-10);
    
    // Analyze preferred medical domains
    const domains = {};
    recentQueries.forEach(q => {
      // Extract domain from query (simplified)
      if (q.query.includes('cancer') || q.query.includes('tumor')) {
        domains.oncology = (domains.oncology || 0) + 1;
      }
      if (q.query.includes('heart') || q.query.includes('cardiac')) {
        domains.cardiology = (domains.cardiology || 0) + 1;
      }
      // Add more domain detection logic
    });
    
    this.userPreferences.preferredDomains = domains;
    
    // Analyze query complexity preferences
    const avgComplexity = recentQueries.reduce((sum, q) => sum + (q.complexity || 0.5), 0) / recentQueries.length;
    this.userPreferences.complexityPreference = avgComplexity;
  }

  // Fallback basic query processing
  basicQueryProcessing(query) {
    return {
      query: `"${query}"[Title/Abstract]`,
      filters: {},
      sort: 'relevance',
      confidence: 0.3,
      explanation: ['Using basic keyword search as fallback']
    };
  }

  // Get search suggestions - now tries Python backend first
  async getSearchSuggestions(partialQuery) {
    try {
      // Try Python backend first
      const response = await fetch(`${this.apiBaseUrl}/api/ml/suggestions?q=${encodeURIComponent(partialQuery)}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ ML suggestions from Python backend');
          return result.data;
        }
      }
    } catch (error) {
      console.warn('⚠️ Python backend suggestions failed, using local fallback:', error);
    }
    
    // Fallback to local suggestions
    return this.getLocalSuggestions(partialQuery);
  }
  
  // Local fallback suggestions
  getLocalSuggestions(partialQuery) {
    const suggestions = [];
    
    // Add MeSH term suggestions
    for (const [term, mesh] of Object.entries(this.meshTerms)) {
      if (term.startsWith(partialQuery.toLowerCase())) {
        suggestions.push({
          text: term,
          type: 'mesh',
          description: `Search for: ${mesh}`,
          confidence: 0.9
        });
      }
    }
    
    // Add historical suggestions
    this.queryHistory.forEach(item => {
      if (item.query.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push({
          text: item.query,
          type: 'history',
          description: 'From your search history',
          confidence: 0.6
        });
      }
    });
    
    return suggestions.slice(0, 8); // Return top 8 suggestions
  }
  
  // Local fallback processing when Python backend is unavailable
  localFallbackProcessing(userQuery, userContext = {}) {
    console.log('🔧 Using local fallback ML processing');
    
    // Basic local processing using existing methods
    const normalizedQuery = this.normalizeQuery(userQuery);
    
    // Simple keyword-based enhancement
    let enhancedQuery = normalizedQuery;
    
    // Check for known MeSH terms
    for (const [term, mesh] of Object.entries(this.meshTerms)) {
      if (normalizedQuery.includes(term)) {
        enhancedQuery = `"${mesh}"[MeSH Terms] OR ${enhancedQuery}`;
        break;
      }
    }
    
    // Return basic enhanced parameters
    return {
      query: enhancedQuery,
      filters: {},
      sort: 'relevance',
      confidence: 0.4,
      explanation: ['Local fallback processing', 'Basic MeSH term mapping'],
      advanced: {
        mesh_terms: [],
        field_restrictions: [],
        date_range: null,
        study_types: [],
        languages: ['eng']
      }
    };
  }
}

// Semantic Search Model for advanced understanding
class SemanticSearchModel {
  constructor() {
    this.embeddings = new Map(); // Simplified embedding storage
    this.initialized = false;
  }

  async initialize() {
    // In a real implementation, this would load pre-trained embeddings
    console.log('Initializing semantic search model...');
    this.initialized = true;
  }

  async getSimilarTerms(term, threshold = 0.7) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Simplified similarity matching
    const similar = [];
    // This would use actual embeddings in production
    return similar;
  }
}

// Export the main class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLQueryProcessor;
} else {
  window.MLQueryProcessor = MLQueryProcessor;
}

//===============================================
// USAGE EXAMPLE AND INTEGRATION
//===============================================

/*
// Initialize the ML Query Processor
const mlProcessor = new MLQueryProcessor();

// Process a user query
async function enhancedSearch(userQuery) {
  try {
    const searchParams = await mlProcessor.processQuery(userQuery);
    console.log('Enhanced search parameters:', searchParams);
    
    // Use the enhanced parameters with PubMed API
    const results = await searchPubMed(searchParams);
    return results;
  } catch (error) {
    console.error('Enhanced search failed:', error);
    // Fallback to basic search
    return await basicPubMedSearch(userQuery);
  }
}

// Integration with existing search function
function integrateWithExistingSearch() {
  const originalPerformSearch = window.performSearch;
  
  window.performSearch = async function(query, isNewSearch = true) {
    // Use ML enhancement
    const mlProcessor = new MLQueryProcessor();
    const enhancedParams = await mlProcessor.processQuery(query);
    
    // Log the enhancement for debugging
    console.log('ML Enhanced Query:', enhancedParams);
    
    // Continue with original search logic but with enhanced query
    return originalPerformSearch.call(this, enhancedParams.query || query, isNewSearch);
  };
}
*/