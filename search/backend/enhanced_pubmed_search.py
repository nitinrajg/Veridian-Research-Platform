
"""
Enhanced PubMed API Integration with ML
Extracted from enhanced-pubmed-integration.js to separate Python backend
"""

import json
import requests
import logging
import re
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any, Union
from urllib.parse import urlencode
from datetime import datetime
from ml_query_processor import MLQueryProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EnhancedPubMedSearch:
    """Enhanced PubMed API handler with ML query processing"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
        self.ml_processor = MLQueryProcessor()
        self.search_cache = {}
        self.api_key = api_key
        self.session = requests.Session()
    
    def search_papers(self, query: str, offset: int = 0, limit: int = 20, filters: Optional[Dict] = None) -> Dict:
        """Main search function with ML enhancements"""
        logger.info(f'🔍 Starting enhanced PubMed search for: {query}')
        
        if filters is None:
            filters = {}
        
        try:
            ml_params = self.ml_processor.process_query(query, {
                'offset': offset,
                'limit': limit,
                'filters': filters,
                'timestamp': datetime.now()
            })
            
            logger.info(f'🤖 ML Enhanced Parameters: {ml_params}')
            
            pubmed_query = self._build_pubmed_query(ml_params, query)
            logger.info(f'📚 Final PubMed Query: {pubmed_query}')
            
            # Search PubMed using eSearch
            search_results = self._perform_esearch(pubmed_query, offset, limit)
            
            if search_results.get('idlist') and len(search_results['idlist']) > 0:
                # Fetch detailed paper information using eSummary and eFetch
                papers = self._fetch_paper_details(search_results['idlist'])
                
                # Apply ML-based ranking and filtering
                ranked_papers = self._apply_ml_ranking(papers, ml_params, query)
                
                # Store search analytics
                self._log_search_analytics(query, ml_params, len(ranked_papers))
                
                return {
                    'papers': ranked_papers,
                    'total': search_results.get('count', 0),
                    'ml_enhanced': True,
                    'confidence': ml_params.get('confidence', 0.5),
                    'explanation': ml_params.get('explanation', [])
                }
            else:
                # Try fallback search with original query
                return self._fallback_search(query, offset, limit)
                
        except Exception as error:
            logger.error(f'Enhanced search failed: {error}')
            return self._fallback_search(query, offset, limit)
    
    def _build_pubmed_query(self, ml_params: Dict, original_query: str) -> str:
        """Build optimized PubMed query from ML parameters"""
        query_parts = []
        
        # Use ML-enhanced query if available
        if ml_params.get('query'):
            query_parts.append(ml_params['query'])
        else:
            query_parts.append(f'({original_query}[Title/Abstract])')
        
        advanced = ml_params.get('advanced', {})
        
        if advanced.get('study_types'):
            study_type_filter = ' OR '.join(
                f'"{st}"[Publication Type]' for st in advanced['study_types']
            )
            query_parts.append(f'AND ({study_type_filter})')
        
        date_range = advanced.get('date_range')
        if date_range and date_range.get('start'):
            try:
                start_date = datetime.fromisoformat(date_range['start'].replace('Z', '+00:00'))
                year = start_date.year
                query_parts.append(f'AND {year}:3000[Date - Publication]')
            except Exception as e:
                logger.warning(f'Failed to parse date range: {e}')
        
        languages = advanced.get('languages', [])
        if 'eng' in languages:
            query_parts.append('AND "english"[Language]')
        
        return ' '.join(query_parts)
    
    def _perform_esearch(self, query: str, offset: int, limit: int) -> Dict:
        """Perform eSearch API call"""
        params = {
            'db': 'pubmed',
            'term': query,
            'retstart': str(offset),
            'retmax': str(limit),
            'retmode': 'json',
            'sort': 'relevance'
        }
        
        if self.api_key:
            params['api_key'] = self.api_key
        
        url = f'{self.base_url}esearch.fcgi'
        
        response = self.session.get(url, params=params)
        if not response.ok:
            raise Exception(f'PubMed eSearch failed: {response.status_code}')
        
        data = response.json()
        return data.get('esearchresult', {})
    
    def _fetch_paper_details(self, pmids: List[str]) -> List[Dict]:
        """Fetch detailed paper information"""
        if not pmids:
            return []
        
        params = {
            'db': 'pubmed',
            'id': ','.join(pmids),
            'retmode': 'json'
        }
        
        if self.api_key:
            params['api_key'] = self.api_key
        
        url = f'{self.base_url}esummary.fcgi'
        
        response = self.session.get(url, params=params)
        if not response.ok:
            raise Exception(f'PubMed eSummary failed: {response.status_code}')
        
        data = response.json()
        result = data.get('result', {})
        papers = []
        
        for pmid, summary in result.items():
            if pmid == 'uids':
                continue
            
            try:
                paper = self._process_paper_summary(pmid, summary)
                if paper:
                    papers.append(paper)
            except Exception as error:
                logger.warning(f'Error processing paper {pmid}: {error}')

        return papers
    
    async def _fetch_abstracts(self, pmids: List[str]) -> Dict[str, str]:
        """Fetch full abstracts using eFetch"""
        result = {}
        if not pmids:
            return result
        
        params = {
            'db': 'pubmed',
            'id': ','.join(pmids),
            'retmode': 'xml'
        }
        
        if self.api_key:
            params['api_key'] = self.api_key
        
        url = f'{self.base_url}efetch.fcgi'
        
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        async with self.session.get(url, params=params) as response:
            if not response.ok:
                raise Exception(f'PubMed eFetch failed: {response.status}')
            
            text = await response.text()
            try:
                root = ET.fromstring(text)
                articles = root.findall('.//PubmedArticle')
                
                for article in articles:
                    try:
                        pmid_elem = article.find('.//PMID')
                        if pmid_elem is None or not pmid_elem.text:
                            continue
                        
                        pmid = pmid_elem.text.strip()
                        
                        abstract_texts = article.findall('.//Abstract/AbstractText')
                        if abstract_texts:
                            parts = []
                            for node in abstract_texts:
                                label = node.get('Label')
                                section = node.text if node.text else ''
                                parts.append(f'{label}: {section}' if label else section)
                            result[pmid] = '\n\n'.join(parts)
                            
                    except Exception as e:
                        continue
                        
            except Exception as e:
                logger.warning(f'Error parsing eFetch XML: {e}')
        
        return result
    
    def _process_paper_summary(self, pmid: str, summary: Dict) -> Optional[Dict]:
        """Process individual paper summary into standardized format"""
        if not summary or summary.get('error'):
            return None
        
        return {
            'paper_id': f'pubmed_{pmid}',
            'pmid': pmid,
            'title': summary.get('title', 'Untitled'),
            'abstract': summary.get('abstract', 'No abstract available'),
            'authors': self._process_authors(summary.get('authors', [])),
            'year': self._extract_year(summary.get('pubdate')),
            'journal': summary.get('source', 'Unknown Journal'),
            'venue': summary.get('source', 'Unknown Venue'),
            'url': f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/',
            'citation_count': None,  # Not available in PubMed API
            'influential_citation_count': None,
            'fields_of_study': self._extract_fields_of_study(summary),
            'publication_date': summary.get('pubdate'),
            'publication_types': summary.get('pubtype', []),
            'doi': self._extract_doi(summary.get('articleids', [])),
            'keywords': self._extract_keywords(summary),
            'mesh_terms': self._extract_mesh_terms(summary),
            'is_open_access': self._check_open_access(summary)
        }
    
    def _process_authors(self, authors: List) -> List[Dict]:
        """Process author information"""
        if not authors:
            return []
        
        processed_authors = []
        for author in authors[:10]:
            if isinstance(author, dict):
                processed_authors.append({
                    'name': author.get('name', 'Unknown Author'),
                    'affiliation': author.get('affiliation')
                })
            else:
                processed_authors.append({
                    'name': str(author),
                    'affiliation': None
                })
        
        return processed_authors
    
    def _extract_year(self, pubdate: str) -> Optional[int]:
        """Extract year from publication date"""
        if not pubdate:
            return None
        
        try:
            if isinstance(pubdate, str):
                year_match = re.search(r'\b(\d{4})\b', pubdate)
                if year_match:
                    return int(year_match.group(1))
            
            return None
        except Exception:
            return None
    
    def _extract_fields_of_study(self, summary: Dict) -> List[str]:
        """Extract fields of study from PubMed categories"""
        fields = []
        
        pub_types = summary.get('pubtype', [])
        for pub_type in pub_types:
            if 'Clinical Trial' in pub_type:
                fields.append('Medicine')
            if 'Review' in pub_type:
                fields.append('Literature Review')
        
        if not fields:
            fields.append('Medicine')
        
        return fields
    
    def _extract_doi(self, article_ids: List) -> Optional[str]:
        """Extract DOI from article IDs"""
        if not article_ids:
            return None
        
        for article_id in article_ids:
            if isinstance(article_id, dict) and article_id.get('idtype') == 'doi':
                return article_id.get('value')
        
        return None
    
    def _extract_keywords(self, summary: Dict) -> List[str]:
        """Extract keywords from summary"""
        keywords = []
        
        title = summary.get('title', '')
        if title:
            title_words = re.findall(r'\b\w{4,}\b', title.lower())
            keywords.extend(title_words[:5])
        
        return keywords
    
    def _extract_mesh_terms(self, summary: Dict) -> List[str]:
        """Extract MeSH terms - would require additional eFetch call"""
        return []
    
    def _check_open_access(self, summary: Dict) -> bool:
        """Check if paper is open access"""
        return False
    
    def _apply_ml_ranking(self, papers: List[Dict], ml_params: Dict, original_query: str) -> List[Dict]:
        """Apply ML-based ranking and filtering"""
        scored_papers = []
        for paper in papers:
            ml_score = self._calculate_relevance_score(paper, ml_params, original_query)
            scored_papers.append({
                **paper,
                'ml_score': ml_score
            })
        
        scored_papers.sort(key=lambda x: x['ml_score'], reverse=True)
        
        return scored_papers
    
    def _calculate_relevance_score(self, paper: Dict, ml_params: Dict, original_query: str) -> float:
        """Calculate relevance score using ML parameters"""
        score = 0.5
        
        title = paper.get('title', '').lower()
        abstract = paper.get('abstract', '').lower()
        query = original_query.lower()
        
        title_relevance = self._calculate_text_relevance(title, query, ml_params)
        score += title_relevance * 0.4
        
        abstract_relevance = self._calculate_text_relevance(abstract, query, ml_params)
        score += abstract_relevance * 0.3
        
        year = paper.get('year')
        if year and year >= datetime.now().year - 2:
            score += 0.1
        
        advanced = ml_params.get('advanced', {})
        study_types = advanced.get('study_types', [])
        if study_types:
            pub_types = paper.get('publication_types', [])
            for pub_type in pub_types:
                if any(st.lower() in pub_type.lower() for st in study_types):
                    score += 0.2
                    break
        
        return min(score, 1.0)
    
    def _calculate_text_relevance(self, text: str, query: str, ml_params: Dict) -> float:
        """Calculate text relevance using simple matching"""
        relevance = 0.0
        
        if query in text:
            relevance += 0.8
        
        query_words = query.split()
        matched_words = [word for word in query_words if len(word) > 2 and word in text]
        if query_words:
            relevance += (len(matched_words) / len(query_words)) * 0.6
        
        focus = ml_params.get('focus', {})
        if focus.get('primary'):
            mesh_term = focus['primary'].lower()
            if mesh_term in text:
                relevance += 0.3
        
        return min(relevance, 1.0)
    
    def _fallback_search(self, query: str, offset: int, limit: int) -> Dict:
        """Fallback search for when ML processing fails"""
        logger.info(f'Using fallback search for: {query}')
        
        simple_query = f'"{query}"[Title/Abstract]'
        search_results = self._perform_esearch(simple_query, offset, limit)
        
        if search_results.get('idlist') and len(search_results['idlist']) > 0:
            papers = self._fetch_paper_details(search_results['idlist'])
            return {
                'papers': papers,
                'total': search_results.get('count', 0),
                'ml_enhanced': False,
                'confidence': 0.3,
                'explanation': ['Using basic keyword search']
            }
        
        return {
            'papers': [],
            'total': 0,
            'ml_enhanced': False,
            'confidence': 0
        }
    
    def _log_search_analytics(self, query: str, ml_params: Dict, result_count: int):
        """Log search analytics for improving ML model"""
        analytics = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'ml_params': {
                'confidence': ml_params.get('confidence', 0.5),
                'intent': ml_params.get('intent', []),
                'focus': ml_params.get('focus', {})
            },
            'result_count': result_count,
            'enhanced': True
        }
        
        logger.info(f'Analytics: {analytics}')
    
    def get_search_suggestions(self, partial_query: str) -> List[Dict]:
        """Get search suggestions with ML enhancement"""
        suggestions = self.ml_processor.get_search_suggestions(partial_query)
        
        return suggestions[:8]

def search_pubmed_papers(query: str, offset: int = 0, limit: int = 20, api_key: Optional[str] = None) -> Dict:
    """Search PubMed papers with ML enhancement - API entry point"""
    search_engine = EnhancedPubMedSearch(api_key=api_key)
    return search_engine.search_papers(query, offset, limit)


def get_pubmed_suggestions(partial_query: str, api_key: Optional[str] = None) -> List[Dict]:
    """Get PubMed search suggestions - API entry point"""
    search_engine = EnhancedPubMedSearch(api_key=api_key)
    return search_engine.get_search_suggestions(partial_query)


if __name__ == "__main__":
    async def test_search():
        """Test the Enhanced PubMed Search"""
        test_queries = [
            "diabetes treatment in elderly patients",
            "COVID-19 vaccine effectiveness",
            "machine learning in healthcare"
        ]
        
        for query in test_queries:
            print(f"\nTesting search: {query}")
            try:
                result = await search_pubmed_papers(query, limit=5)
                print(f"Found {len(result['papers'])} papers")
                print(f"ML Enhanced: {result['ml_enhanced']}")
                print(f"Confidence: {result['confidence']}")
                if result['papers']:
                    print(f"First paper: {result['papers'][0]['title']}")
            except Exception as e:
                print(f"Search failed: {e}")
    
    asyncio.run(test_search())