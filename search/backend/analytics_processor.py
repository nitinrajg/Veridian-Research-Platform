"""
Persistent Search Analytics System
Extracted from search-results.js to separate Python backend
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PersistentSearchAnalytics:
    """Persistent Search Analytics System for tracking ML-enhanced searches"""
    
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else Path('../data/analytics_data')
        self.data_dir.mkdir(exist_ok=True)
        
        self.storage_file = self.data_dir / 'search_history.json'
        self.analytics_file = self.data_dir / 'analytics_data.json'
        
        self._init_storage()
        
        logger.info('🔧 Initializing Persistent Search Analytics...')
        self._initialize_analytics_data()
        logger.info('✅ Persistent Search Analytics initialized')
    
    def _init_storage(self):
        """Initialize storage files if they don't exist"""
        if not self.storage_file.exists():
            with open(self.storage_file, 'w') as f:
                json.dump([], f)
        
        if not self.analytics_file.exists():
            self._initialize_analytics_data()
    
    def _initialize_analytics_data(self):
        """Initialize analytics data structure"""
        try:
            with open(self.analytics_file, 'r') as f:
                existing_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            initial_data = {
                'total_searches': 0,
                'ml_enhanced_searches': 0,
                'total_response_time': 0,
                'total_confidence': 0,
                'successful_searches': 0,
                'search_history': [],
                'last_updated': datetime.now().isoformat(),
                'version': '2.0.0'
            }
            
            with open(self.analytics_file, 'w') as f:
                json.dump(initial_data, f, indent=2)
    
    def record_search(self, search_data: Dict) -> Optional[Dict]:
        """Record a search with complete data"""
        try:
            timestamp = datetime.now().isoformat()
            search_id = f"search_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:9]}"
            
            search_record = {
                'id': search_id,
                'timestamp': timestamp,
                'query': search_data.get('query', ''),
                'ml_enhanced': bool(search_data.get('ml_enhanced', False)),
                'response_time': float(search_data.get('response_time', 0)),
                'confidence': float(search_data.get('confidence', 0.5)),
                'result_count': int(search_data.get('result_count', 0)),
                'status': search_data.get('status', 'success'),
                'explanation': search_data.get('explanation', []),
                'query_length': len(search_data.get('query', '').split()),
                'filters': search_data.get('filters', {}),
                'search_type': search_data.get('search_type', 'standard')
            }
            
            logger.info(f'📊 Recording search: {search_record}')
            
            self._add_to_search_history(search_record)
            
            self._update_analytics_data(search_record)
            
            logger.info('✅ Search recorded successfully')
            return search_record
            
        except Exception as error:
            logger.error(f'❌ Failed to record search: {error}')
            return None
    
    def _add_to_search_history(self, search_record: Dict):
        """Add to search history"""
        try:
            with open(self.storage_file, 'r') as f:
                history = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            history = []
        
        history.insert(0, search_record)
        
        if len(history) > 100:
            history = history[:100]
        
        with open(self.storage_file, 'w') as f:
            json.dump(history, f, indent=2)
    
    def _update_analytics_data(self, search_record: Dict):
        """Update analytics data"""
        try:
            with open(self.analytics_file, 'r') as f:
                analytics_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            analytics_data = {
                'total_searches': 0,
                'ml_enhanced_searches': 0,
                'total_response_time': 0,
                'total_confidence': 0,
                'successful_searches': 0,
                'last_updated': datetime.now().isoformat()
            }
        
        analytics_data['total_searches'] += 1
        analytics_data['total_response_time'] += search_record['response_time']
        analytics_data['total_confidence'] += search_record['confidence']
        
        if search_record['ml_enhanced']:
            analytics_data['ml_enhanced_searches'] += 1
        
        if search_record['status'] == 'success':
            analytics_data['successful_searches'] += 1
        
        analytics_data['last_updated'] = datetime.now().isoformat()
        
        with open(self.analytics_file, 'w') as f:
            json.dump(analytics_data, f, indent=2)
        
        logger.info(f'📈 Analytics data updated: {analytics_data}')
    
    def get_search_history(self) -> List[Dict]:
        """Get search history"""
        try:
            with open(self.storage_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            logger.error('Failed to get search history')
            return []
    
    def get_analytics_data(self) -> Optional[Dict]:
        """Get analytics data"""
        try:
            with open(self.analytics_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            logger.error('Failed to get analytics data')
            return None
    
    def get_calculated_metrics(self) -> Dict:
        """Get calculated metrics"""
        analytics_data = self.get_analytics_data()
        search_history = self.get_search_history()
        
        if not analytics_data or not search_history:
            return {
                'total_searches': 0,
                'ml_enhancement_rate': 0,
                'average_response_time': 0,
                'average_confidence': 0,
                'success_rate': 0,
                'searches_today': 0,
                'average_query_length': 0,
                'last_search_time': None
            }
        
        total_searches = analytics_data['total_searches']
        ml_enhanced = analytics_data['ml_enhanced_searches']
        avg_response_time = (analytics_data['total_response_time'] / total_searches) if total_searches > 0 else 0
        avg_confidence = (analytics_data['total_confidence'] / total_searches) if total_searches > 0 else 0
        success_rate = (analytics_data['successful_searches'] / total_searches) if total_searches > 0 else 0
        
        today = datetime.now().date()
        searches_today = 0
        for search in search_history:
            try:
                search_date = datetime.fromisoformat(search['timestamp']).date()
                if search_date == today:
                    searches_today += 1
            except Exception:
                continue
        
        avg_query_length = 0
        if search_history:
            total_length = sum(search.get('query_length', 0) for search in search_history)
            avg_query_length = total_length / len(search_history)
        
        last_search_time = search_history[0]['timestamp'] if search_history else None
        
        return {
            'total_searches': total_searches,
            'ml_enhancement_rate': (ml_enhanced / total_searches * 100) if total_searches > 0 else 0,
            'average_response_time': round(avg_response_time),
            'average_confidence': round(avg_confidence * 100),
            'success_rate': round(success_rate * 100),
            'searches_today': searches_today,
            'average_query_length': round(avg_query_length, 1),
            'last_search_time': last_search_time
        }
    
    def get_hourly_stats(self) -> List[Dict]:
        """Get hourly stats for charts"""
        search_history = self.get_search_history()
        hourly_stats = []
        now = datetime.now()
        
        for i in range(23, -1, -1):
            hour = now - timedelta(hours=i)
            hour = hour.replace(minute=0, second=0, microsecond=0)
            
            hour_searches = []
            for search in search_history:
                try:
                    search_time = datetime.fromisoformat(search['timestamp'])
                    if (search_time.hour == hour.hour and 
                        search_time.date() == hour.date()):
                        hour_searches.append(search)
                except Exception:
                    continue
            
            avg_response_time = 0
            ml_enhancement_rate = 0
            avg_confidence = 0
            
            if hour_searches:
                avg_response_time = sum(s['response_time'] for s in hour_searches) / len(hour_searches)
                ml_enhanced_count = sum(1 for s in hour_searches if s['ml_enhanced'])
                ml_enhancement_rate = ml_enhanced_count / len(hour_searches)
                avg_confidence = sum(s['confidence'] for s in hour_searches) / len(hour_searches)
            
            hourly_stats.append({
                'hour': hour.hour,
                'search_count': len(hour_searches),
                'average_response_time': round(avg_response_time),
                'ml_enhancement_rate': ml_enhancement_rate,
                'average_confidence': avg_confidence,
                'timestamp': hour.isoformat()
            })
        
        return hourly_stats
    
    def get_trending_terms(self, limit: int = 10) -> List[Dict]:
        """Get trending search terms"""
        search_history = self.get_search_history()
        
        week_ago = datetime.now() - timedelta(days=7)
        recent_searches = []
        
        for search in search_history:
            try:
                search_time = datetime.fromisoformat(search['timestamp'])
                if search_time >= week_ago:
                    recent_searches.append(search)
            except Exception:
                continue
        
        term_counts = {}
        for search in recent_searches:
            query = search.get('query', '')
            words = query.lower().split()
            for word in words:
                if len(word) > 3:
                    term_counts[word] = term_counts.get(word, 0) + 1
        
        sorted_terms = sorted(term_counts.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {'term': term, 'count': count, 'trend_score': count / len(recent_searches)}
            for term, count in sorted_terms[:limit]
        ]
    
    def get_performance_metrics(self) -> Dict:
        """Get detailed performance metrics"""
        search_history = self.get_search_history()
        analytics_data = self.get_analytics_data()
        
        if not search_history or not analytics_data:
            return {'error': 'No data available'}
        
        response_times = [s['response_time'] for s in search_history if s.get('response_time')]
        response_times.sort()
        
        if response_times:
            p50 = response_times[len(response_times) // 2]
            p95 = response_times[int(len(response_times) * 0.95)]
            p99 = response_times[int(len(response_times) * 0.99)]
        else:
            p50 = p95 = p99 = 0
        
        ml_searches = [s for s in search_history if s.get('ml_enhanced')]
        non_ml_searches = [s for s in search_history if not s.get('ml_enhanced')]
        
        ml_avg_results = sum(s.get('result_count', 0) for s in ml_searches) / len(ml_searches) if ml_searches else 0
        non_ml_avg_results = sum(s.get('result_count', 0) for s in non_ml_searches) / len(non_ml_searches) if non_ml_searches else 0
        
        error_count = sum(1 for s in search_history if s.get('status') != 'success')
        error_rate = (error_count / len(search_history) * 100) if search_history else 0
        
        return {
            'response_time_percentiles': {
                'p50': p50,
                'p95': p95,
                'p99': p99
            },
            'ml_effectiveness': {
                'ml_avg_results': round(ml_avg_results, 1),
                'non_ml_avg_results': round(non_ml_avg_results, 1),
                'improvement_factor': round(ml_avg_results / non_ml_avg_results, 2) if non_ml_avg_results > 0 else 0
            },
            'error_rate': round(error_rate, 2),
            'total_searches': len(search_history),
            'ml_enhanced_count': len(ml_searches),
            'data_quality': {
                'complete_records': sum(1 for s in search_history if all(k in s for k in ['query', 'response_time', 'confidence'])),
                'incomplete_records': sum(1 for s in search_history if not all(k in s for k in ['query', 'response_time', 'confidence']))
            }
        }
    
    def clear_all_data(self):
        """Clear all analytics data"""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump([], f)
            
            self._initialize_analytics_data()
            logger.info('🗑️ All analytics data cleared')
        except Exception as e:
            logger.error(f'Failed to clear data: {e}')
    
    def export_data(self, export_path: Optional[str] = None) -> str:
        """Export all analytics data to a file"""
        if not export_path:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            export_path = f'analytics_export_{timestamp}.json'
        
        export_data = {
            'search_history': self.get_search_history(),
            'analytics_data': self.get_analytics_data(),
            'calculated_metrics': self.get_calculated_metrics(),
            'hourly_stats': self.get_hourly_stats(),
            'trending_terms': self.get_trending_terms(),
            'performance_metrics': self.get_performance_metrics(),
            'export_timestamp': datetime.now().isoformat(),
            'version': '2.0.0'
        }
        
        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f'📤 Analytics data exported to {export_path}')
        return export_path
    
    def get_data_summary(self) -> Dict:
        """Get data summary for debugging"""
        history = self.get_search_history()
        analytics = self.get_analytics_data()
        metrics = self.get_calculated_metrics()
        
        return {
            'search_history_count': len(history),
            'analytics_data': analytics,
            'calculated_metrics': metrics,
            'recent_searches': history[:5],
            'storage_info': {
                'storage_file_size': self.storage_file.stat().st_size if self.storage_file.exists() else 0,
                'analytics_file_size': self.analytics_file.stat().st_size if self.analytics_file.exists() else 0,
                'storage_file_path': str(self.storage_file),
                'analytics_file_path': str(self.analytics_file)
            }
        }

analytics_processor = PersistentSearchAnalytics()


def record_search_analytics(search_data: Dict) -> Optional[Dict]:
    """Record search analytics - API entry point"""
    return analytics_processor.record_search(search_data)


def get_search_analytics() -> List[Dict]:
    """Get search analytics - API entry point"""
    return analytics_processor.get_search_history()


def get_analytics_summary() -> Dict:
    """Get analytics summary - API entry point"""
    return analytics_processor.get_calculated_metrics()


def get_analytics_hourly_stats() -> List[Dict]:
    """Get hourly analytics stats - API entry point"""
    return analytics_processor.get_hourly_stats()


def get_analytics_trending_terms(limit: int = 10) -> List[Dict]:
    """Get trending search terms - API entry point"""
    return analytics_processor.get_trending_terms(limit)


def get_analytics_performance() -> Dict:
    """Get performance metrics - API entry point"""
    return analytics_processor.get_performance_metrics()


def clear_analytics_data():
    """Clear all analytics data - API entry point"""
    analytics_processor.clear_all_data()


def export_analytics_data(export_path: Optional[str] = None) -> str:
    """Export analytics data - API entry point"""
    return analytics_processor.export_data(export_path)


def debug_analytics() -> Dict:
    """Debug analytics data - API entry point"""
    return analytics_processor.get_data_summary()


if __name__ == "__main__":
    logger.info("Testing Analytics Processor...")
    
    test_searches = [
        {
            'query': 'diabetes treatment',
            'ml_enhanced': True,
            'response_time': 1200,
            'confidence': 0.85,
            'result_count': 15,
            'status': 'success',
            'explanation': ['MeSH mapping', 'Query expansion'],
            'search_type': 'new_search'
        },
        {
            'query': 'COVID-19 symptoms',
            'ml_enhanced': True,
            'response_time': 950,
            'confidence': 0.92,
            'result_count': 23,
            'status': 'success',
            'explanation': ['MeSH mapping', 'Semantic analysis'],
            'search_type': 'new_search'
        },
        {
            'query': 'heart disease prevention',
            'ml_enhanced': False,
            'response_time': 1800,
            'confidence': 0.3,
            'result_count': 8,
            'status': 'success',
            'explanation': ['Basic keyword search'],
            'search_type': 'fallback'
        }
    ]
    
    for search_data in test_searches:
        result = record_search_analytics(search_data)
        if result:
            logger.info(f"✅ Recorded search: {result['id']}")
    
    summary = get_analytics_summary()
    logger.info(f"📊 Analytics Summary: {json.dumps(summary, indent=2)}")
    
    trending = get_analytics_trending_terms(5)
    logger.info(f"🔥 Trending Terms: {json.dumps(trending, indent=2)}")
    
    performance = get_analytics_performance()
    logger.info(f"⚡ Performance Metrics: {json.dumps(performance, indent=2)}")
    
    logger.info("✅ Analytics Processor test completed")