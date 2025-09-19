
"""
Machine Learning Enhanced Query Processor for PubMed API Integration
Extracted from ml-query-processor.js to separate Python backend
"""

import json
import re
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
import logging


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MLQueryProcessor:
    """Machine Learning Enhanced Query Processor for medical literature search"""
    
    def __init__(self, user_data_file: Optional[str] = None):
        self.mesh_terms = self._initialize_mesh_terms()
        self.medical_abbreviations = self._initialize_medical_abbreviations()
        self.synonym_map = self._initialize_synonym_map()
        self.user_data_file = user_data_file or '../data/ml_query_history.json'
        self.query_history = self._load_query_history()
        self.user_preferences = self._load_user_preferences()
        self.semantic_model = SemanticSearchModel()
        
    def _initialize_mesh_terms(self) -> Dict[str, str]:
        """Initialize comprehensive MeSH terms database"""
        return {
            'heart attack': 'Myocardial Infarction',
            'heart disease': 'Heart Diseases',
            'high blood pressure': 'Hypertension',
            'stroke': 'Stroke',
            'cardiac': 'Heart Diseases',
            
            'diabetes': 'Diabetes Mellitus',
            'sugar diabetes': 'Diabetes Mellitus',
            'thyroid': 'Thyroid Diseases',
            
            'asthma': 'Asthma',
            'lung disease': 'Lung Diseases',
            'pneumonia': 'Pneumonia',
            'copd': 'Pulmonary Disease, Chronic Obstructive',
            
            'cancer': 'Neoplasms',
            'tumor': 'Neoplasms',
            'breast cancer': 'Breast Neoplasms',
            'lung cancer': 'Lung Neoplasms',
            'skin cancer': 'Skin Neoplasms',
            
            'alzheimer': 'Alzheimer Disease',
            'dementia': 'Dementia',
            'parkinson': 'Parkinson Disease',
            'epilepsy': 'Epilepsy',
            'seizure': 'Seizures',
            
            'depression': 'Depression',
            'anxiety': 'Anxiety Disorders',
            'ptsd': 'Stress Disorders, Post-Traumatic',
            'bipolar': 'Bipolar Disorder',
            
            'covid': 'COVID-19',
            'coronavirus': 'COVID-19',
            'hiv': 'HIV Infections',
            'aids': 'Acquired Immunodeficiency Syndrome',
            'tuberculosis': 'Tuberculosis',
            'malaria': 'Malaria',
            
            'arthritis': 'Arthritis',
            'osteoporosis': 'Osteoporosis',
            'joint pain': 'Arthralgia',
            
            'machine learning': 'Machine Learning',
            'artificial intelligence': 'Artificial Intelligence',
            'deep learning': 'Deep Learning',
            'neural network': 'Neural Networks, Computer',
            'gene therapy': 'Genetic Therapy',
            'immunotherapy': 'Immunotherapy',
            'telemedicine': 'Telemedicine'
        }
    
    def _initialize_medical_abbreviations(self) -> Dict[str, str]:
        """Initialize medical abbreviations"""
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
        }
    
    def _initialize_synonym_map(self) -> Dict[str, List[str]]:
        """Initialize synonym mapping for better query expansion"""
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
        }
    
    def _load_query_history(self) -> List[Dict]:
        """Load query history from file"""
        try:
            with open(self.user_data_file, 'r') as f:
                data = json.load(f)
                return data.get('query_history', [])
        except FileNotFoundError:
            return []
        except json.JSONDecodeError:
            logger.warning(f"Corrupted query history file: {self.user_data_file}")
            return []
    
    def _load_user_preferences(self) -> Dict:
        """Load user preferences from file"""
        try:
            with open(self.user_data_file, 'r') as f:
                data = json.load(f)
                return data.get('user_preferences', {})
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_user_data(self):
        """Save query history and user preferences to file"""
        try:
            data = {
                'query_history': self.query_history[-100:],
                'user_preferences': self.user_preferences,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.user_data_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save user data: {e}")
    
    def process_query(self, user_query: str, user_context: Optional[Dict] = None) -> Dict:
        """Main query processing function with ML enhancements"""
        logger.info(f'Processing query with ML enhancements: {user_query}')
        
        if user_context is None:
            user_context = {}
        
        try:
            normalized_query = self._normalize_query(user_query)
            
            entities = self._extract_medical_entities(normalized_query)
            
            semantic_analysis = self._perform_semantic_analysis(normalized_query, entities)
            
            search_params = self._generate_search_parameters(semantic_analysis, user_context)
            
            self._update_user_model(user_query, user_context)
            
            return search_params
            
        except Exception as error:
            logger.error(f'Error in ML query processing: {error}')
            return self._basic_query_processing(user_query)
    
    def _normalize_query(self, query: str) -> str:
        """Normalize and clean the input query"""
        return re.sub(r'\s+', ' ', 
               re.sub(r'[^\w\s-]', ' ', query.lower().strip())).strip()
    
    async def _extract_medical_entities(self, query: str) -> Dict:
        """Extract medical entities using pattern matching and NLP"""
        entities = {
            'mesh_terms': [],
            'abbreviations': [],
            'conditions': [],
            'treatments': [],
            'demographics': [],
            'study_types': []
        }
        
        for term, mesh_term in self.mesh_terms.items():
            if term in query:
                entities['mesh_terms'].append({
                    'original': term,
                    'mesh': mesh_term,
                    'confidence': 0.9
                })
        
        for abbrev, full_term in self.medical_abbreviations.items():
            pattern = rf'\b{re.escape(abbrev)}\b'
            if re.search(pattern, query, re.IGNORECASE):
                entities['abbreviations'].append({
                    'abbreviation': abbrev,
                    'expanded': full_term,
                    'confidence': 0.85
                })
        
        demographic_patterns = {
            'age': r'\b(infant|child|adolescent|adult|elderly|aged|geriatric)\b',
            'gender': r'\b(male|female|men|women|man|woman)\b',
            'population': r'\b(pregnant|pregnancy|postmenopausal|pediatric)\b'
        }
        
        for demo_type, pattern in demographic_patterns.items():
            matches = re.findall(pattern, query, re.IGNORECASE)
            if matches:
                entities['demographics'].append({
                    'type': demo_type,
                    'values': list(set(m.lower() for m in matches)),
                    'confidence': 0.8
                })
        
        study_type_patterns = {
            'randomized controlled trial': r'\b(rct|randomized controlled trial|clinical trial)\b',
            'meta-analysis': r'\b(meta-analysis|systematic review)\b',
            'case study': r'\b(case study|case report)\b',
            'cohort study': r'\b(cohort study|longitudinal)\b'
        }
        
        for study_type, pattern in study_type_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                entities['study_types'].append({
                    'type': study_type,
                    'confidence': 0.9
                })
        
        return entities
    
    async def _perform_semantic_analysis(self, query: str, entities: Dict) -> Dict:
        """Perform semantic analysis using advanced NLP"""
        analysis = {
            'intent': self._classify_intent(query),
            'sentiment': self._analyze_sentiment(query),
            'complexity': self._assess_complexity(query, entities),
            'focus': self._determine_focus(query, entities),
            'synonyms': self._expand_with_synonyms(query),
            'related_terms': await self._find_related_terms(entities)
        }
        
        return analysis
    
    def _classify_intent(self, query: str) -> List[Dict]:
        """Classify the search intent"""
        intent_patterns = {
            'treatment': r'\b(treat|therapy|intervention|cure|medication|drug)\b',
            'diagnosis': r'\b(diagnos|detect|screen|test|identify)\b',
            'prevention': r'\b(prevent|avoid|prophylax|vaccination|immuniz)\b',
            'symptoms': r'\b(symptom|sign|manifest|present)\b',
            'causes': r'\b(cause|etiology|pathogen|risk factor)\b',
            'prognosis': r'\b(prognosis|outcome|survival|mortality)\b',
            'epidemiology': r'\b(prevalence|incidence|epidemiol|population)\b',
            'mechanism': r'\b(mechanism|pathway|molecular|cellular)\b'
        }
        
        intents = []
        for intent, pattern in intent_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                intents.append({
                    'type': intent,
                    'confidence': 0.8
                })
        
        return intents if intents else [{'type': 'general', 'confidence': 0.5}]
    
    def _analyze_sentiment(self, query: str) -> Dict:
        """Analyze sentiment to understand urgency or specificity"""
        urgency_pattern = r'\b(urgent|emergency|acute|severe|critical|immediate)\b'
        uncertainty_pattern = r'\b(possible|potential|may|might|could|uncertain)\b'
        specificity_pattern = r'\b(specific|particular|exact|precise)\b'
        
        return {
            'urgency': 0.8 if re.search(urgency_pattern, query, re.IGNORECASE) else 0.2,
            'uncertainty': 0.7 if re.search(uncertainty_pattern, query, re.IGNORECASE) else 0.3,
            'specificity': 0.9 if re.search(specificity_pattern, query, re.IGNORECASE) else 0.5
        }
    
    def _assess_complexity(self, query: str, entities: Dict) -> float:
        """Assess query complexity"""
        complexity = 0.0
        
        word_count = len(query.split())
        complexity += min(word_count * 0.1, 1)
        
        entity_count = sum(len(v) for v in entities.values() if isinstance(v, list))
        complexity += min(entity_count * 0.15, 1)
        
        if re.search(r'\b(and|or|not)\b', query, re.IGNORECASE):
            complexity += 0.3
        
        return min(complexity, 1)
    
    def _determine_focus(self, query: str, entities: Dict) -> Dict:
        """Determine the primary focus of the query"""
        focus = {
            'primary': None,
            'secondary': [],
            'confidence': 0
        }
        
        if entities['mesh_terms']:
            focus['primary'] = entities['mesh_terms'][0]['mesh']
            focus['confidence'] = 0.9
        
        for term in entities['mesh_terms'][1:]:
            focus['secondary'].append(term['mesh'])
        
        return focus
    
    def _expand_with_synonyms(self, query: str) -> List[Dict]:
        """Expand query with synonyms"""
        expanded = []
        
        for term, synonyms in self.synonym_map.items():
            if term in query:
                expanded.append({
                    'original': term,
                    'synonyms': synonyms,
                    'relevance': 0.7
                })
        
        return expanded
    
    async def _find_related_terms(self, entities: Dict) -> List[Dict]:
        """Find related terms using medical knowledge"""
        related = []
        
        for entity in entities['mesh_terms']:
            related_terms = self._get_related_mesh_terms(entity['mesh'])
            if related_terms:
                related.append({
                    'primary': entity['mesh'],
                    'related': related_terms,
                    'relevance': 0.6
                })
        
        return related
    
    def _get_related_mesh_terms(self, mesh_term: str) -> List[str]:
        """Get related MeSH terms based on medical relationships"""
        relationships = {
            'Diabetes Mellitus': ['Insulin', 'Glucose', 'Diabetic Complications', 'Metabolic Syndrome'],
            'Hypertension': ['Blood Pressure', 'Cardiovascular Diseases', 'Antihypertensive Agents'],
            'Heart Diseases': ['Myocardial Infarction', 'Heart Failure', 'Coronary Artery Disease'],
            'Neoplasms': ['Oncology', 'Chemotherapy', 'Radiotherapy', 'Carcinogenesis'],
            'Depression': ['Antidepressive Agents', 'Mental Health', 'Anxiety Disorders'],
            'COVID-19': ['SARS-CoV-2', 'Pandemic', 'Vaccines', 'Respiratory Tract Infections']
        }
        
        return relationships.get(mesh_term, [])
    
    async def _generate_search_parameters(self, semantic_analysis: Dict, user_context: Dict) -> Dict:
        """Generate enhanced PubMed search parameters"""
        params = {
            'query': '',
            'filters': {},
            'sort': 'relevance',
            'advanced': {
                'mesh_terms': [],
                'field_restrictions': [],
                'date_range': None,
                'study_types': [],
                'languages': ['eng']
            },
            'confidence': 0,
            'explanation': []
        }
        
        query_parts = []
        
        if semantic_analysis['focus']['primary']:
            query_parts.append(f'"{semantic_analysis["focus"]["primary"]}"[MeSH Terms]')
        
        for term in semantic_analysis['focus']['secondary']:
            query_parts.append(f'"{term}"[MeSH Terms]')
        
        for syn in semantic_analysis['synonyms']:
            for synonym in syn['synonyms']:
                query_parts.append(f'"{synonym}"[Title/Abstract]')
        
        if len(query_parts) > 1:
            params['query'] = ' OR '.join(query_parts)
        elif len(query_parts) == 1:
            params['query'] = query_parts[0]
        
        if any(i['type'] == 'treatment' for i in semantic_analysis['intent']):
            params['filters']['publication_type'] = 'clinical trial,randomized controlled trial'
            params['explanation'].append('Focusing on treatment studies')
        
        if semantic_analysis['sentiment']['urgency'] > 0.7:
            params['advanced']['date_range'] = {
                'start': (datetime.now() - timedelta(days=365)).isoformat()
            }
            params['explanation'].append('Prioritizing recent publications due to urgency indicators')
        
        if any(i['type'] == 'epidemiology' for i in semantic_analysis['intent']):
            params['sort'] = 'publication date'
            params['explanation'].append('Sorting by date for epidemiological trends')
        
        params['confidence'] = self._calculate_search_confidence(semantic_analysis)
        
        return params
    
    def _calculate_search_confidence(self, analysis: Dict) -> float:
        """Calculate confidence score for the search strategy"""
        confidence = 0.5
        
        if analysis['focus']['primary']:
            confidence += 0.3
        
        if analysis['intent'] and analysis['intent'][0]['confidence'] > 0.7:
            confidence += 0.2
        
        if analysis['sentiment']['uncertainty'] > 0.6:
            confidence -= 0.1
        
        return min(max(confidence, 0), 1)
    
    def _update_user_model(self, query: str, context: Dict):
        """Update user model based on interactions"""
        interaction = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'context': context,
            'processed': True
        }
        
        self.query_history.append(interaction)
        
        if len(self.query_history) > 100:
            self.query_history = self.query_history[-100:]
        
        self._analyze_user_patterns()
        
        self._save_user_data()
    
    def _analyze_user_patterns(self):
        """Analyze user patterns to improve future searches"""
        if len(self.query_history) < 5:
            return
        
        recent_queries = self.query_history[-10:]
        
        domains = {}
        for q in recent_queries:
            query_text = q['query']
            if 'cancer' in query_text or 'tumor' in query_text:
                domains['oncology'] = domains.get('oncology', 0) + 1
            if 'heart' in query_text or 'cardiac' in query_text:
                domains['cardiology'] = domains.get('cardiology', 0) + 1
        
        self.user_preferences['preferred_domains'] = domains
        
        avg_complexity = sum(q.get('complexity', 0.5) for q in recent_queries) / len(recent_queries)
        self.user_preferences['complexity_preference'] = avg_complexity
    
    def _basic_query_processing(self, query: str) -> Dict:
        """Fallback basic query processing"""
        return {
            'query': f'"{query}"[Title/Abstract]',
            'filters': {},
            'sort': 'relevance',
            'confidence': 0.3,
            'explanation': ['Using basic keyword search as fallback']
        }
    
    def get_search_suggestions(self, partial_query: str) -> List[Dict]:
        """Get search suggestions based on user history and ML"""
        suggestions = []
        
        for term, mesh in self.mesh_terms.items():
            if term.startswith(partial_query.lower()):
                suggestions.append({
                    'text': term,
                    'type': 'mesh',
                    'description': f'Search for: {mesh}',
                    'confidence': 0.9
                })
        
        for item in self.query_history:
            if partial_query.lower() in item['query'].lower():
                suggestions.append({
                    'text': item['query'],
                    'type': 'history',
                    'description': 'From your search history',
                    'confidence': 0.6
                })
        
        return suggestions[:8]


class SemanticSearchModel:
    """Semantic Search Model for advanced understanding"""
    
    def __init__(self):
        self.embeddings = {}
        self.initialized = False
    
    async def initialize(self):
        """Initialize the semantic search model"""
        logger.info('Initializing semantic search model...')
        self.initialized = True
    
    async def get_similar_terms(self, term: str, threshold: float = 0.7) -> List[str]:
        """Get similar terms using semantic similarity"""
        if not self.initialized:
            await self.initialize()
        
        similar = []
        return similar

async def process_ml_query(query: str, context: Optional[Dict] = None) -> Dict:
    """Process a query with ML enhancements - API entry point"""
    processor = MLQueryProcessor()
    return await processor.process_query(query, context)


def get_ml_suggestions(partial_query: str) -> List[Dict]:
    """Get ML-enhanced search suggestions - API entry point"""
    processor = MLQueryProcessor()
    return processor.get_search_suggestions(partial_query)


if __name__ == "__main__":
    import asyncio
    
    async def test_processor():
        """Test the ML Query Processor"""
        processor = MLQueryProcessor()
        
        test_queries = [
            "diabetes treatment in elderly patients",
            "COVID-19 vaccine effectiveness",
            "heart attack symptoms"
        ]
        
        for query in test_queries:
            print(f"\nProcessing: {query}")
            result = await processor.process_query(query)
            print(f"Result: {json.dumps(result, indent=2)}")
    
    asyncio.run(test_processor())