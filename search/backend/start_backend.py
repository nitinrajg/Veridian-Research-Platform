"""
Startup script for the ML-Enhanced Search Backend
"""

import sys
import os
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 7):
        logger.error("Python 3.7 or higher is required")
        return False
    logger.info(f"Python version: {sys.version}")
    return True

def install_dependencies():
    """Install required Python packages"""
    requirements_file = Path(__file__).parent / 'requirements.txt'
    
    if not requirements_file.exists():
        logger.warning("requirements.txt not found, skipping dependency installation")
        return True
    
    try:
        logger.info("Installing Python dependencies...")
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)
        ], check=True, capture_output=True, text=True)
        logger.info("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install dependencies: {e}")
        logger.error(f"Error output: {e.stderr}")
        return False

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'flask',
        'flask_cors',
        'aiohttp'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.warning(f"Missing packages: {missing_packages}")
        logger.info("Attempting to install missing packages...")
        return install_dependencies()
    
    logger.info("✅ All required dependencies are available")
    return True

def start_server(host='127.0.0.1', port=5000, debug=False):
    """Start the Flask API server"""
    try:
        logger.info(f"🚀 Starting ML Search API Server on {host}:{port}")
        logger.info(f"📋 API Documentation will be available at: http://{host}:{port}/api/docs")
        logger.info(f"🏥 Health check available at: http://{host}:{port}/health")
        logger.info("")
        logger.info("To test the backend, you can run:")
        logger.info(f"curl http://{host}:{port}/health")
        logger.info("")
        logger.info("Press Ctrl+C to stop the server")
        logger.info("=" * 60)
        
        from api_server import app
        app.run(
            host=host,
            port=port,
            debug=debug,
            threaded=True
        )
        
    except ImportError as e:
        logger.error(f"❌ Failed to import API server: {e}")
        logger.error("Make sure all Python files are in the correct location")
        return False
    except KeyboardInterrupt:
        logger.info("\n👋 Server stopped by user")
        return True
    except Exception as e:
        logger.error(f"❌ Server failed to start: {e}")
        return False

def main():
    """Main startup function"""
    logger.info("=" * 60)
    logger.info("🧬 ML-Enhanced Search Backend Startup")
    logger.info("=" * 60)
    
    if not check_python_version():
        sys.exit(1)
    
    if not check_dependencies():
        logger.error("❌ Failed to resolve dependencies")
        logger.info("Please install dependencies manually:")
        logger.info("pip install flask flask-cors aiohttp")
        sys.exit(1)
    
    import argparse
    parser = argparse.ArgumentParser(description='ML Search API Server Startup')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to (default: 127.0.0.1)')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to (default: 5000)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--no-deps-check', action='store_true', help='Skip dependency check')
    
    args = parser.parse_args()
    
    success = start_server(args.host, args.port, args.debug)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()