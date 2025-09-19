"""
Flask API Server for Python-JavaScript Communication Bridge
Provides RESTful endpoints for ML-enhanced search functionality
"""

import json
import asyncio
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import Dict, List, Optional, Any
import traceback

from ml_query_processor import MLQueryProcessor, get_ml_suggestions
from enhanced_pubmed_search import EnhancedPubMedSearch, search_pubmed_papers, get_pubmed_suggestions
from analytics_processor import PersistentSearchAnalytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

ml_processor = MLQueryProcessor()
pubmed_search = EnhancedPubMedSearch()
analytics = PersistentSearchAnalytics()


def async_endpoint(func):
    """Decorator to make Flask endpoints async-compatible"""
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(func(*args, **kwargs))
        finally:
            loop.close()
    wrapper.__name__ = func.__name__
    return wrapper


def record_search_analytics(data: Dict) -> Optional[Dict]:
    """Record search analytics"""
    return analytics.record_search(data)


def get_search_analytics() -> List[Dict]:
    """Get search analytics"""
    return analytics.get_search_history()


def get_analytics_summary() -> Dict:
    """Get analytics summary"""
    return analytics.get_calculated_metrics()


def get_analytics_hourly_stats() -> List[Dict]:
    """Get hourly analytics stats"""
    return analytics.get_hourly_stats()


def get_analytics_trending_terms(limit: int = 10) -> List[Dict]:
    """Get trending terms"""
    return analytics.get_trending_terms(limit)


def get_analytics_performance() -> Dict:
    """Get performance metrics"""
    return analytics.get_performance_metrics()


def export_analytics_data() -> str:
    """Export analytics data"""
    return analytics.export_data()


def clear_analytics_data():
    """Clear analytics data"""
    analytics.clear_all_data()


def debug_analytics() -> Dict:
    """Debug analytics"""
    return analytics.get_data_summary()


def _normalize_analytics_payload(payload: Dict) -> Dict:
    """Normalize frontend camelCase analytics keys to backend snake_case."""
    if not isinstance(payload, dict):
        return {}
    key_map = {
        'mlEnhanced': 'ml_enhanced',
        'responseTime': 'response_time',
        'resultCount': 'result_count',
        'searchType': 'search_type',
    }
    normalized: Dict[str, Any] = {}
    for key, value in payload.items():
        target_key = key_map.get(key, key)
        normalized[target_key] = value
    if 'query' not in normalized:
        normalized['query'] = ''
    if 'ml_enhanced' not in normalized and 'mlEnhanced' in payload:
        normalized['ml_enhanced'] = bool(payload.get('mlEnhanced'))
    return normalized


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    from datetime import datetime
    return jsonify({
        'status': 'healthy',
        'service': 'ML Search API',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })



@app.route('/api/ml/process-query', methods=['POST'])
def process_query_endpoint():
    """Process query with ML enhancements"""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query = data['query']
        context = data.get('context', {})
        
        logger.info(f'🔍 Processing ML query: {query}')
        
        result = ml_processor.process_query(query, context)
        
        logger.info(f'✅ ML query processed successfully')
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f'❌ ML query processing failed: {str(e)}')
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'fallback': True
        }), 500


@app.route('/api/ml/suggestions', methods=['GET'])
def get_suggestions_endpoint():
    """Get ML-enhanced search suggestions"""
    try:
        partial_query = request.args.get('q', '')
        if not partial_query:
            return jsonify({'error': 'Query parameter q is required'}), 400
        
        logger.info(f'🔮 Getting ML suggestions for: {partial_query}')
        
        suggestions = get_ml_suggestions(partial_query)
        
        return jsonify({
            'success': True,
            'data': suggestions
        })
        
    except Exception as e:
        logger.error(f'❌ ML suggestions failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500



@app.route('/api/pubmed/search', methods=['POST'])
@async_endpoint
async def pubmed_search_endpoint():
    """Enhanced PubMed search with ML"""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query = data['query']
        offset = data.get('offset', 0)
        limit = data.get('limit', 20)
        api_key = data.get('api_key')
        
        logger.info(f'🔍 PubMed search: {query} (offset: {offset}, limit: {limit})')
        
        result = await search_pubmed_papers(query, offset, limit, api_key)
        
        logger.info(f'✅ PubMed search completed: {len(result.get("papers", []))} papers found')
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f'❌ PubMed search failed: {str(e)}')
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {
                'papers': [],
                'total': 0,
                'ml_enhanced': False,
                'confidence': 0
            }
        }), 500


@app.route('/api/pubmed/suggestions', methods=['GET'])
@async_endpoint
async def pubmed_suggestions_endpoint():
    """Get PubMed search suggestions"""
    try:
        partial_query = request.args.get('q', '')
        api_key = request.args.get('api_key')
        
        if not partial_query:
            return jsonify({'error': 'Query parameter q is required'}), 400
        
        logger.info(f'🔮 Getting PubMed suggestions for: {partial_query}')
        
        suggestions = await get_pubmed_suggestions(partial_query, api_key)
        
        return jsonify({
            'success': True,
            'data': suggestions
        })
        
    except Exception as e:
        logger.error(f'❌ PubMed suggestions failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500


@app.route('/api/analytics/record', methods=['POST'])
def record_analytics_endpoint():
    """Record search analytics"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Analytics data is required'}), 400
        
        logger.info(f'📊 Recording analytics: {data.get("query", "unknown")}')
        
        # Normalize keys to backend format
        normalized = _normalize_analytics_payload(data)
        
        result = record_search_analytics(normalized)
        
        if result:
            logger.info(f'✅ Analytics recorded: {result["id"]}')
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to record analytics'
            }), 500
        
    except Exception as e:
        logger.error(f'❌ Analytics recording failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analytics/history', methods=['GET'])
def get_analytics_history_endpoint():
    """Get search analytics history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        history = get_search_analytics()
        
        # Apply limit
        if limit > 0:
            history = history[:limit]
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        })
        
    except Exception as e:
        logger.error(f'❌ Analytics history retrieval failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500


@app.route('/api/analytics/summary', methods=['GET'])
def get_analytics_summary_endpoint():
    """Get analytics summary metrics"""
    try:
        summary = get_analytics_summary()
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        logger.error(f'❌ Analytics summary failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {}
        }), 500


@app.route('/api/analytics/hourly', methods=['GET'])
def get_hourly_stats_endpoint():
    """Get hourly analytics statistics"""
    try:
        stats = get_analytics_hourly_stats()
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f'❌ Hourly stats failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500


@app.route('/api/analytics/trending', methods=['GET'])
def get_trending_terms_endpoint():
    """Get trending search terms"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        trending = get_analytics_trending_terms(limit)
        
        return jsonify({
            'success': True,
            'data': trending
        })
        
    except Exception as e:
        logger.error(f'❌ Trending terms failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': []
        }), 500


@app.route('/api/analytics/performance', methods=['GET'])
def get_performance_metrics_endpoint():
    """Get performance metrics"""
    try:
        performance = get_analytics_performance()
        
        return jsonify({
            'success': True,
            'data': performance
        })
        
    except Exception as e:
        logger.error(f'❌ Performance metrics failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {}
        }), 500


@app.route('/api/analytics/export', methods=['GET'])
def export_analytics_endpoint():
    """Export analytics data"""
    try:
        export_path = export_analytics_data()
        
        return jsonify({
            'success': True,
            'data': {
                'export_path': export_path,
                'message': 'Analytics data exported successfully'
            }
        })
        
    except Exception as e:
        logger.error(f'❌ Analytics export failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analytics/clear', methods=['POST'])
def clear_analytics_endpoint():
    """Clear all analytics data"""
    try:
        clear_analytics_data()
        
        return jsonify({
            'success': True,
            'message': 'Analytics data cleared successfully'
        })
        
    except Exception as e:
        logger.error(f'❌ Analytics clear failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analytics/debug', methods=['GET'])
def debug_analytics_endpoint():
    """Debug analytics data"""
    try:
        debug_info = debug_analytics()
        
        return jsonify({
            'success': True,
            'data': debug_info
        })
        
    except Exception as e:
        logger.error(f'❌ Analytics debug failed: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {}
        }), 500



@app.route('/api/search/enhanced', methods=['POST'])
@async_endpoint
async def enhanced_search_endpoint():
    """Enhanced search combining ML processing and PubMed search"""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        query = data['query']
        offset = data.get('offset', 0)
        limit = data.get('limit', 20)
        api_key = data.get('api_key')
        record_analytics = data.get('record_analytics', True)
        
        logger.info(f'🚀 Enhanced search: {query}')
        
        import time
        start_time = time.time()
        
        try:
            result = await search_pubmed_papers(query, offset, limit, api_key)
            
            response_time = int((time.time() - start_time) * 1000)
            
            if record_analytics:
                analytics_data = {
                    'query': query,
                    'ml_enhanced': result.get('ml_enhanced', False),
                    'response_time': response_time,
                    'confidence': result.get('confidence', 0.5),
                    'result_count': len(result.get('papers', [])),
                    'status': 'success',
                    'explanation': result.get('explanation', []),
                    'search_type': 'enhanced_search',
                    'filters': data.get('filters', {})
                }
                
                analytics_result = record_search_analytics(_normalize_analytics_payload(analytics_data))
                if analytics_result:
                    result['analytics_id'] = analytics_result['id']
            
            result['response_time'] = response_time
            
            logger.info(f'✅ Enhanced search completed: {len(result.get("papers", []))} papers, {response_time}ms')
            
            return jsonify({
                'success': True,
                'data': result
            })
            
        except Exception as search_error:
            response_time = int((time.time() - start_time) * 1000)
            
            if record_analytics:
                analytics_data = {
                    'query': query,
                    'ml_enhanced': False,
                    'response_time': response_time,
                    'confidence': 0,
                    'result_count': 0,
                    'status': 'error',
                    'explanation': [str(search_error)],
                    'search_type': 'enhanced_search',
                    'filters': data.get('filters', {})
                }
                record_search_analytics(_normalize_analytics_payload(analytics_data))
            
            raise search_error
        
    except Exception as e:
        logger.error(f'❌ Enhanced search failed: {str(e)}')
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'data': {
                'papers': [],
                'total': 0,
                'ml_enhanced': False,
                'confidence': 0
            }
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed'
    }), 405


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal server error: {str(error)}')
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500



@app.route('/api/docs', methods=['GET'])
def api_documentation():
    """API documentation endpoint"""
    return jsonify({
        'service': 'ML-Enhanced Search API',
        'version': '1.0.0',
        'endpoints': {
            'health': {
                'method': 'GET',
                'path': '/health',
                'description': 'Health check'
            },
            'ml_process_query': {
                'method': 'POST',
                'path': '/api/ml/process-query',
                'description': 'Process query with ML enhancements',
                'parameters': {
                    'query': 'string (required)',
                    'context': 'object (optional)'
                }
            },
            'ml_suggestions': {
                'method': 'GET',
                'path': '/api/ml/suggestions',
                'description': 'Get ML search suggestions',
                'parameters': {
                    'q': 'string (required) - partial query'
                }
            },
            'pubmed_search': {
                'method': 'POST',
                'path': '/api/pubmed/search',
                'description': 'Enhanced PubMed search',
                'parameters': {
                    'query': 'string (required)',
                    'offset': 'integer (optional, default: 0)',
                    'limit': 'integer (optional, default: 20)',
                    'api_key': 'string (optional)'
                }
            },
            'enhanced_search': {
                'method': 'POST',
                'path': '/api/search/enhanced',
                'description': 'Main enhanced search endpoint',
                'parameters': {
                    'query': 'string (required)',
                    'offset': 'integer (optional, default: 0)',
                    'limit': 'integer (optional, default: 20)',
                    'api_key': 'string (optional)',
                    'record_analytics': 'boolean (optional, default: true)'
                }
            },
            'analytics_record': {
                'method': 'POST',
                'path': '/api/analytics/record',
                'description': 'Record search analytics'
            },
            'analytics_summary': {
                'method': 'GET',
                'path': '/api/analytics/summary',
                'description': 'Get analytics summary'
            }
        }
    })



if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='ML Search API Server')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    
    args = parser.parse_args()
    
    logger.info(f'🚀 Starting ML Search API Server on {args.host}:{args.port}')
    logger.info(f'📋 API Documentation available at: http://{args.host}:{args.port}/api/docs')
    logger.info(f'🏥 Health check available at: http://{args.host}:{args.port}/health')
    
    app.run(
        host=args.host,
        port=args.port,
        debug=args.debug,
        threaded=True
    )