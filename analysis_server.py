"""FastAPI service that runs the network analyzer and exposes the results."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from network_analyzer import NetworkAnalyzer

# Load environment variables from .env file
load_dotenv()

DATA_DIR = Path('public/data')
RESULT_FILE = DATA_DIR / 'network_analysis_results.json'
MINDMAP_FILE = DATA_DIR / 'network_mind_map.json'
TIMELINE_FILE = DATA_DIR / 'protocol_timeline_sample.json'
SUPPORTED_EXTENSIONS = {'.pcap', '.pcapng'}

app = FastAPI(title='Network Analyzer Service', version='1.0.0')

# Get configuration from environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not set in environment. Please create a .env file based on .env.example")

SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "14400"))  # Default 4 hours

# Add SessionMiddleware for cookie-based session management
app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    session_cookie="session_id",
    max_age=SESSION_MAX_AGE,
    same_site="lax",
    https_only=False  # Set to True in production with HTTPS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# Session validation dependency
async def require_session(request: Request) -> str:
    """
    Dependency that ensures the user has a valid session.

    Args:
        request: FastAPI Request object

    Returns:
        str: Session ID

    Raises:
        HTTPException: 401 if session_id is not found
    """
    session_id = request.session.get("session_id")
    if not session_id:
        # If no session exists, create one automatically
        import uuid
        session_id = str(uuid.uuid4())
        request.session["session_id"] = session_id
    return session_id


def get_session_data_dir(request: Request) -> Path:
    """
    Get the data directory path for the current session.

    Args:
        request: FastAPI Request object

    Returns:
        Path: Session data directory absolute path

    Raises:
        ValueError: If session ID is not found
    """
    session_id = request.session.get("session_id")
    if not session_id:
        raise ValueError("No session ID found in request")

    # Create session-specific directory under public/data/
    data_dir = Path("public/data") / session_id
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def cleanup_expired_sessions(max_age_seconds: int = 14400):
    """
    Clean up expired session directories.

    This function scans all session directories under public/data/ and deletes
    those that haven't been modified for longer than max_age_seconds.

    Args:
        max_age_seconds: Maximum session age in seconds (default: 14400 = 4 hours)
    """
    import time
    import shutil
    import logging

    logger = logging.getLogger(__name__)
    data_dir = Path("public/data")

    if not data_dir.exists():
        logger.info("No data directory found, skipping cleanup")
        return

    current_time = time.time()
    cleaned_count = 0

    for session_dir in data_dir.iterdir():
        # Skip non-directory items and static files
        if not session_dir.is_dir():
            continue

        # Skip the static fixture directory (if exists)
        if session_dir.name in ['protocol_timeline_sample.json', 'network_mind_map.json', 'network_analysis_results.json']:
            continue

        try:
            # Check directory last modification time
            last_modified = session_dir.stat().st_mtime
            age = current_time - last_modified

            if age > max_age_seconds:
                # Session has expired, delete it
                shutil.rmtree(session_dir)
                cleaned_count += 1
                logger.info(f"Cleaned up expired session: {session_dir.name} (age: {age:.0f}s)")
        except Exception as e:
            logger.error(f"Failed to cleanup session {session_dir.name}: {e}")

    if cleaned_count > 0:
        logger.info(f"Cleanup completed: {cleaned_count} expired sessions removed")
    else:
        logger.debug("No expired sessions found")


def _run_analysis(pcap_path: Path) -> Dict[str, Any]:
    capture_path = pcap_path
    temp_copy = None
    try:
        if not capture_path.exists():
            raise ValueError('???????')

        try:
            str(capture_path).encode('ascii')
        except UnicodeEncodeError:
            with NamedTemporaryFile(delete=False, suffix=capture_path.suffix) as temp_handle:
                temp_handle.write(capture_path.read_bytes())
                temp_copy = Path(temp_handle.name)
            capture_path = temp_copy

        analyzer = NetworkAnalyzer(str(capture_path))
        if not analyzer.load_packets():
            message = analyzer.last_error or '????????'
            raise ValueError(message)
    finally:
        if temp_copy is not None:
            Path(temp_copy).unlink(missing_ok=True)

    analyzer.basic_statistics()
    analyzer.detect_packet_loss()
    analyzer.analyze_latency()
    analyzer.build_mind_map()
    analyzer.generate_protocol_timelines()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    analyzer.save_results(
        output_file=str(RESULT_FILE),
        public_output_dir=str(DATA_DIR),
    )

    return analyzer.analysis_results


def _load_cached_results() -> Dict[str, Any] | None:
    if RESULT_FILE.exists():
        with RESULT_FILE.open('r', encoding='utf-8') as handle:
            return json.load(handle)
    return None


def _load_timeline_fixture() -> Dict[str, Any] | None:
    if TIMELINE_FILE.exists():
        with TIMELINE_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    return None


@app.get('/api/health')
def health_check() -> Dict[str, str]:
    """Health check endpoint (no session required)"""
    from datetime import datetime
    return {
        'status': 'ok',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }


@app.get('/api/analysis')
async def get_analysis(
    request: Request,
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Get cached analysis results (requires session)"""
    session_dir = get_session_data_dir(request)
    result_file = session_dir / 'network_analysis_results.json'

    if not result_file.exists():
        raise HTTPException(status_code=404, detail='No analysis has been generated yet for this session')

    with result_file.open('r', encoding='utf-8') as handle:
        cached = json.load(handle)

    return {'analysis': cached}


@app.get('/api/timelines')
async def get_timelines(
    request: Request,
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Get protocol timeline data (requires session)"""
    session_dir = get_session_data_dir(request)
    timeline_file = session_dir / 'protocol_timeline_sample.json'

    # Try session-specific timeline first
    if timeline_file.exists():
        with timeline_file.open('r', encoding='utf-8') as handle:
            return json.load(handle)

    # Fallback to static fixture if no session-specific data exists
    fixture = _load_timeline_fixture()
    if not fixture:
        raise HTTPException(status_code=404, detail='No timeline data available')
    return fixture


@app.get('/api/packets/{connection_id}')
async def get_connection_packets(
    connection_id: str,
    request: Request,
    session_id: str = Depends(require_session),
    offset: int = 0,
    limit: int = 100
) -> Dict[str, Any]:
    """Get detailed packet information for a specific connection (requires session)

    Args:
        connection_id: The connection ID (e.g., 'tcp-10.1.1.14-5434-210.71.227.211-443')
        offset: Starting index for pagination (default: 0)
        limit: Maximum number of packets to return (default: 100)

    Returns:
        Dictionary containing connection_id and list of packet details
    """
    session_dir = get_session_data_dir(request)
    packets_file = session_dir / 'connection_packets.json'

    # Check if connection_packets file exists
    if not packets_file.exists():
        raise HTTPException(
            status_code=404,
            detail='No packet data available. Please analyze a PCAP file first.'
        )

    # Load connection packets data
    with packets_file.open('r', encoding='utf-8') as handle:
        all_connection_packets = json.load(handle)

    # Check if the requested connection exists
    if connection_id not in all_connection_packets:
        raise HTTPException(
            status_code=404,
            detail=f'Connection "{connection_id}" not found'
        )

    # Get packets for this connection
    packets = all_connection_packets[connection_id]

    # Apply pagination
    total_packets = len(packets)
    paginated_packets = packets[offset:offset + limit]

    return {
        'connection_id': connection_id,
        'total_packets': total_packets,
        'offset': offset,
        'limit': limit,
        'packets': paginated_packets
    }


@app.post('/api/analyze')
async def analyze_capture(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Upload and analyze PCAP file (requires session)"""
    print(f"[DEBUG] /api/analyze called, session_id={session_id}")
    print(f"[DEBUG] File received: {file.filename}")

    filename = file.filename or ''
    suffix = Path(filename).suffix.lower()
    print(f"[DEBUG] File suffix: {suffix}")

    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail='Only pcap and pcapng files are supported')

    data = await file.read()
    print(f"[DEBUG] File size: {len(data)} bytes")
    if not data:
        raise HTTPException(status_code=400, detail='Upload is empty')

    # Save uploaded file to session directory
    session_dir = get_session_data_dir(request)
    pcap_path = session_dir / 'uploaded.pcap'
    print(f"[DEBUG] Saving to: {pcap_path}")

    with open(pcap_path, 'wb') as handle:
        handle.write(data)
    print(f"[DEBUG] File saved successfully")

    try:
        # Run analysis and save results to session directory
        print(f"[DEBUG] Creating NetworkAnalyzer...")
        analyzer = NetworkAnalyzer(str(pcap_path))
        print(f"[DEBUG] Loading packets...")
        if not analyzer.load_packets():
            message = analyzer.last_error or 'Failed to load packets'
            raise ValueError(message)
        print(f"[DEBUG] Loaded {len(analyzer.packets)} packets")

        print(f"[DEBUG] Running basic_statistics...")
        analyzer.basic_statistics()
        print(f"[DEBUG] Running detect_packet_loss...")
        analyzer.detect_packet_loss()
        print(f"[DEBUG] Running analyze_latency...")
        analyzer.analyze_latency()
        print(f"[DEBUG] Running build_mind_map...")
        analyzer.build_mind_map()
        print(f"[DEBUG] Running generate_protocol_timelines...")
        analyzer.generate_protocol_timelines()
        print(f"[DEBUG] Generated {len(analyzer.protocol_timelines)} timelines")

        # Save results to session directory
        print(f"[DEBUG] Saving results to {session_dir}...")
        analyzer.save_results(
            output_file=str(session_dir / 'network_analysis_results.json'),
            public_output_dir=str(session_dir),
        )
        print(f"[DEBUG] Results saved successfully")

        result = {
            'message': 'PCAP file analyzed successfully',
            'session_id': session_id,
            'packet_count': len(analyzer.packets),
            'timeline_count': len(analyzer.protocol_timelines) if hasattr(analyzer, 'protocol_timelines') else 0
        }
        print(f"[DEBUG] Returning result: {result}")
        return result
    except Exception as exc:
        import traceback
        error_detail = f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}"
        print(f"ERROR in /api/analyze: {error_detail}")  # Print to console
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)}") from exc


# Startup event to initialize cleanup scheduler
@app.on_event("startup")
async def start_cleanup_scheduler():
    """Initialize APScheduler to run session cleanup periodically"""
    from apscheduler.schedulers.background import BackgroundScheduler
    import logging

    logger = logging.getLogger(__name__)
    scheduler = BackgroundScheduler()

    # Schedule cleanup to run every hour
    cleanup_interval_hours = int(os.getenv("CLEANUP_INTERVAL", "3600")) / 3600
    max_age = int(os.getenv("SESSION_MAX_AGE", "14400"))

    scheduler.add_job(
        cleanup_expired_sessions,
        'interval',
        hours=cleanup_interval_hours,
        kwargs={"max_age_seconds": max_age},
        id='cleanup_sessions',
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Session cleanup scheduler started (interval: {cleanup_interval_hours}h, max_age: {max_age}s)")
