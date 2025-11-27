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


def cleanup_session_directory(session_dir: Path) -> None:
    """
    Clean up all files in the current session directory.
    Called when uploading a new file to remove old analysis results.

    Args:
        session_dir: Path to session directory to clean
    """
    import shutil
    import logging

    logger = logging.getLogger(__name__)

    if not session_dir.exists():
        return

    try:
        # Remove all files in the session directory
        for item in session_dir.iterdir():
            if item.is_file():
                item.unlink()
                logger.debug(f"Removed old file: {item.name}")
            elif item.is_dir():
                shutil.rmtree(item)
                logger.debug(f"Removed old directory: {item.name}")

        logger.info(f"Cleaned up session directory: {session_dir.name}")
    except Exception as e:
        logger.error(f"Failed to cleanup session directory {session_dir.name}: {e}")


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
            # Check if directory is empty
            files = list(session_dir.glob('*'))
            if not files:
                # Empty directory, remove it
                session_dir.rmdir()
                cleaned_count += 1
                logger.info(f"Cleaned up empty session directory: {session_dir.name}")
                continue

            # Check directory last modification time
            last_modified = max(f.stat().st_mtime for f in files)
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
    analyzer.detect_attacks()  # 攻擊偵測
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
            data = json.load(handle)
            # 嘗試附加攻擊分析數據
            analysis_file = session_dir / 'network_analysis_results.json'
            if analysis_file.exists():
                with analysis_file.open('r', encoding='utf-8') as af:
                    analysis_data = json.load(af)
                    if 'attack_analysis' in analysis_data:
                        data['attackAnalysis'] = analysis_data['attack_analysis']
            return data

    # Fallback to static fixture if no session-specific data exists
    fixture = _load_timeline_fixture()
    if not fixture:
        raise HTTPException(status_code=404, detail='No timeline data available')
    return fixture


@app.get('/api/attacks')
async def get_attack_analysis(
    request: Request,
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Get attack detection analysis (requires session)"""
    session_dir = get_session_data_dir(request)
    analysis_file = session_dir / 'network_analysis_results.json'

    if not analysis_file.exists():
        raise HTTPException(status_code=404, detail='No analysis data available')

    with analysis_file.open('r', encoding='utf-8') as handle:
        data = json.load(handle)

    attack_analysis = data.get('attack_analysis')
    if not attack_analysis:
        return {
            'metrics': {},
            'tcp_flags': {},
            'top_sources': [],
            'top_targets': [],
            'attack_detection': {
                'detected': False,
                'type': None,
                'description': None,
                'severity': 'normal',
                'confidence': 0,
                'anomaly_score': 0
            }
        }

    return attack_analysis


@app.post('/api/packets/batch')
async def get_batch_packets(
    request: Request,
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Get packets for multiple connections in batch (requires session)

    Request body:
        {
            "connection_ids": ["tcp-...", "tcp-...", ...],
            "packets_per_connection": 20  // Max packets per connection
        }

    Returns:
        {
            "results": {
                "tcp-...": {"packets": [...], "total_packets": 100},
                "tcp-...": {"packets": [...], "total_packets": 50}
            },
            "total_connections": 2
        }
    """
    session_dir = get_session_data_dir(request)
    packets_file = session_dir / 'connection_packets.json'

    # Parse request body
    body = await request.json()
    connection_ids = body.get('connection_ids', [])
    packets_per_connection = min(body.get('packets_per_connection', 20), 100)  # Max 100 per connection

    # Validate
    if not connection_ids:
        raise HTTPException(status_code=400, detail='connection_ids is required')

    if len(connection_ids) > 100:
        raise HTTPException(status_code=400, detail='Maximum 100 connections per batch request')

    # Check if connection_packets file exists
    if not packets_file.exists():
        raise HTTPException(
            status_code=404,
            detail='No packet data available. Please analyze a PCAP file first.'
        )

    # Load all connection packets
    with packets_file.open('r', encoding='utf-8') as handle:
        all_connection_packets = json.load(handle)

    # Build batch results
    results = {}
    for conn_id in connection_ids:
        if conn_id in all_connection_packets:
            packets = all_connection_packets[conn_id]
            results[conn_id] = {
                'packets': packets[:packets_per_connection],
                'total_packets': len(packets),
                'returned_packets': min(len(packets), packets_per_connection)
            }
        else:
            results[conn_id] = {
                'packets': [],
                'total_packets': 0,
                'returned_packets': 0,
                'error': 'Connection not found'
            }

    return {
        'results': results,
        'total_connections': len(connection_ids),
        'packets_per_connection': packets_per_connection
    }


@app.post('/api/packets/statistics')
async def get_packet_statistics(
    request: Request,
    session_id: str = Depends(require_session)
) -> Dict[str, Any]:
    """Get packet rate statistics for attack timeline visualization

    Request body:
        {
            "connection_ids": ["tcp-...", ...],  // Optional: filter by connections
            "time_bucket_ms": 100  // Time bucket size in milliseconds
        }

    Returns:
        {
            "timeline": [
                {"time": 0, "packet_count": 5, "byte_count": 1200, "syn_count": 5},
                {"time": 100, "packet_count": 12, "byte_count": 2800, "syn_count": 10},
                ...
            ],
            "summary": {
                "total_packets": 4975,
                "total_bytes": 361542,
                "duration_ms": 3200,
                "peak_rate": 520,  // packets per second
                "avg_rate": 155,
                "attack_type": "SYN Flood"
            }
        }
    """
    import math

    session_dir = get_session_data_dir(request)
    packets_file = session_dir / 'connection_packets.json'

    # Parse request body
    body = await request.json()
    connection_ids = body.get('connection_ids', None)  # None means all connections
    time_bucket_ms = min(body.get('time_bucket_ms', 100), 1000)  # Max 1 second buckets

    # Check if connection_packets file exists
    if not packets_file.exists():
        raise HTTPException(
            status_code=404,
            detail='No packet data available. Please analyze a PCAP file first.'
        )

    # Load all connection packets
    with packets_file.open('r', encoding='utf-8') as handle:
        all_connection_packets = json.load(handle)

    # Filter connections if specified
    if connection_ids:
        filtered_packets = {k: v for k, v in all_connection_packets.items() if k in connection_ids}
    else:
        filtered_packets = all_connection_packets

    # Collect all packets with timestamps
    all_packets = []
    for conn_id, packets in filtered_packets.items():
        for packet in packets:
            if 'timestamp' in packet:
                all_packets.append({
                    'timestamp': packet['timestamp'],
                    'length': packet.get('length', 0),
                    'tcp_flags': packet.get('headers', {}).get('tcp', {}).get('flags', ''),
                    'connection_id': conn_id
                })

    if not all_packets:
        return {
            'timeline': [],
            'summary': {
                'total_packets': 0,
                'total_bytes': 0,
                'duration_ms': 0,
                'peak_rate': 0,
                'avg_rate': 0,
                'attack_type': 'Unknown'
            }
        }

    # Sort by timestamp
    all_packets.sort(key=lambda p: p['timestamp'])

    # Calculate time range
    min_time = all_packets[0]['timestamp']
    max_time = all_packets[-1]['timestamp']
    duration_seconds = max_time - min_time
    duration_ms = int(duration_seconds * 1000)

    # Create time buckets
    num_buckets = max(1, math.ceil(duration_ms / time_bucket_ms))
    timeline = []

    for i in range(num_buckets):
        bucket_start = min_time + (i * time_bucket_ms / 1000)
        bucket_end = bucket_start + (time_bucket_ms / 1000)

        bucket_packets = [p for p in all_packets if bucket_start <= p['timestamp'] < bucket_end]

        syn_count = sum(1 for p in bucket_packets if 'S' in p.get('tcp_flags', ''))
        ack_count = sum(1 for p in bucket_packets if 'A' in p.get('tcp_flags', ''))
        rst_count = sum(1 for p in bucket_packets if 'R' in p.get('tcp_flags', ''))

        timeline.append({
            'time_ms': i * time_bucket_ms,
            'time_seconds': round(i * time_bucket_ms / 1000, 2),
            'packet_count': len(bucket_packets),
            'byte_count': sum(p.get('length', 0) for p in bucket_packets),
            'syn_count': syn_count,
            'ack_count': ack_count,
            'rst_count': rst_count
        })

    # Calculate summary statistics
    total_packets = len(all_packets)
    total_bytes = sum(p.get('length', 0) for p in all_packets)
    total_syn = sum(1 for p in all_packets if 'S' in p.get('tcp_flags', ''))
    total_fin = sum(1 for p in all_packets if 'F' in p.get('tcp_flags', ''))
    total_rst = sum(1 for p in all_packets if 'R' in p.get('tcp_flags', ''))
    total_ack = sum(1 for p in all_packets if 'A' in p.get('tcp_flags', ''))
    total_urg = sum(1 for p in all_packets if 'U' in p.get('tcp_flags', ''))
    total_psh = sum(1 for p in all_packets if 'P' in p.get('tcp_flags', ''))
    # URG-PSH-FIN combination: packets with all three flags set simultaneously
    total_urg_psh_fin = sum(1 for p in all_packets
        if all(f in p.get('tcp_flags', '') for f in ['U', 'P', 'F']))

    # Calculate rates (packets per second)
    packet_counts = [b['packet_count'] for b in timeline]
    peak_rate = int(max(packet_counts) * (1000 / time_bucket_ms)) if packet_counts else 0
    avg_rate = int(total_packets / duration_seconds) if duration_seconds > 0 else 0

    # Calculate TCP flag ratios
    syn_ratio = total_syn / total_packets if total_packets > 0 else 0
    fin_ratio = total_fin / total_packets if total_packets > 0 else 0
    rst_ratio = total_rst / total_packets if total_packets > 0 else 0
    ack_ratio = total_ack / total_packets if total_packets > 0 else 0
    urg_ratio = total_urg / total_packets if total_packets > 0 else 0
    psh_ratio = total_psh / total_packets if total_packets > 0 else 0
    urg_psh_fin_ratio = total_urg_psh_fin / total_packets if total_packets > 0 else 0

    # Detect attack type with priority order and calculate threat level
    # Priority: URG-PSH-FIN (most specific) > SYN Flood > FIN Flood > RST Attack > ...
    threat_level = 'low'  # low, medium, high

    # URG-PSH-FIN Attack has HIGHEST priority - this is a very specific malicious pattern
    if urg_psh_fin_ratio > 0.2 and total_packets > 50:
        # URG-PSH-FIN Attack: Abnormal flag combination attack
        # Packets with URG+PSH+FIN simultaneously indicate malicious traffic
        attack_type = 'URG-PSH-FIN Attack'
        threat_level = 'high'
    elif urg_ratio > 0.3 and psh_ratio > 0.5 and fin_ratio > 0.3 and total_packets > 50:
        # Alternative URG-PSH-FIN detection: High individual flag ratios
        attack_type = 'URG-PSH-FIN Attack'
        threat_level = 'high'
    elif syn_ratio > 0.7 and total_packets > 100:
        attack_type = 'SYN Flood'
        threat_level = 'high'
    elif fin_ratio > 0.5 and syn_ratio < 0.3 and total_packets > 100:
        # FIN Flood: High FIN ratio but low SYN (sending FIN without proper handshake)
        attack_type = 'FIN Flood'
        threat_level = 'high'
    elif rst_ratio > 0.4 and total_packets > 100:
        attack_type = 'RST Attack'
        threat_level = 'high' if rst_ratio > 0.6 else 'medium'
    elif peak_rate > 1000:
        attack_type = 'High Volume Attack'
        threat_level = 'medium'
    elif (fin_ratio > 0.4 or rst_ratio > 0.3) and total_packets > 50:
        # Suspicious: elevated FIN or RST but not conclusive
        attack_type = 'Suspicious Traffic'
        threat_level = 'medium'
    else:
        attack_type = 'Normal Traffic'
        threat_level = 'low'

    # Calculate anomaly score (0-100) based on flag ratios
    anomaly_score = 0
    if syn_ratio > 0.5:
        anomaly_score += min(30, (syn_ratio - 0.5) * 60)
    if fin_ratio > 0.3:
        anomaly_score += min(25, (fin_ratio - 0.3) * 50)
    if rst_ratio > 0.2:
        anomaly_score += min(25, (rst_ratio - 0.2) * 50)
    if ack_ratio < 0.3:
        anomaly_score += min(20, (0.3 - ack_ratio) * 66)
    # URG-PSH-FIN combination is highly anomalous
    if urg_psh_fin_ratio > 0.1:
        anomaly_score += min(30, urg_psh_fin_ratio * 100)
    if urg_ratio > 0.2:
        anomaly_score += min(15, (urg_ratio - 0.2) * 50)
    anomaly_score = min(100, round(anomaly_score))

    return {
        'timeline': timeline,
        'summary': {
            'total_packets': total_packets,
            'total_bytes': total_bytes,
            'total_connections': len(filtered_packets),
            'duration_ms': duration_ms,
            'duration_seconds': round(duration_seconds, 2),
            'peak_rate': peak_rate,
            'avg_rate': avg_rate,
            'syn_count': total_syn,
            'syn_ratio': round(syn_ratio * 100, 1),
            'fin_count': total_fin,
            'fin_ratio': round(fin_ratio * 100, 1),
            'rst_count': total_rst,
            'rst_ratio': round(rst_ratio * 100, 1),
            'ack_count': total_ack,
            'ack_ratio': round(ack_ratio * 100, 1),
            'urg_count': total_urg,
            'urg_ratio': round(urg_ratio * 100, 1),
            'psh_count': total_psh,
            'psh_ratio': round(psh_ratio * 100, 1),
            'urg_psh_fin_count': total_urg_psh_fin,
            'urg_psh_fin_ratio': round(urg_psh_fin_ratio * 100, 1),
            'attack_type': attack_type,
            'threat_level': threat_level,
            'anomaly_score': anomaly_score
        }
    }


# Dynamic route MUST come AFTER static routes (/api/packets/batch, /api/packets/statistics)
# to avoid route conflicts where 'batch' or 'statistics' gets matched as {connection_id}
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

    # Get session directory and clean up old files
    session_dir = get_session_data_dir(request)

    # Clean up old files in current session before saving new file
    cleanup_session_directory(session_dir)
    print(f"[DEBUG] Cleaned up old session files")

    # Save uploaded file to session directory
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
        print(f"[DEBUG] Running detect_attacks...")
        analyzer.detect_attacks()
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


# Global scheduler reference for proper cleanup
_scheduler = None


# Startup event to initialize cleanup scheduler
@app.on_event("startup")
async def start_cleanup_scheduler():
    """Initialize APScheduler to run session cleanup periodically"""
    global _scheduler
    from apscheduler.schedulers.background import BackgroundScheduler
    import logging

    logger = logging.getLogger(__name__)
    _scheduler = BackgroundScheduler()

    # Schedule cleanup to run every hour
    cleanup_interval_hours = int(os.getenv("CLEANUP_INTERVAL", "3600")) / 3600
    max_age = int(os.getenv("SESSION_MAX_AGE", "14400"))

    _scheduler.add_job(
        cleanup_expired_sessions,
        'interval',
        hours=cleanup_interval_hours,
        kwargs={"max_age_seconds": max_age},
        id='cleanup_sessions',
        replace_existing=True
    )

    _scheduler.start()
    logger.info(f"Session cleanup scheduler started (interval: {cleanup_interval_hours}h, max_age: {max_age}s)")


@app.on_event("shutdown")
async def shutdown_cleanup_scheduler():
    """Properly shutdown the APScheduler to prevent zombie processes"""
    global _scheduler
    import logging

    logger = logging.getLogger(__name__)

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)  # Don't wait for jobs to complete
        logger.info("Session cleanup scheduler stopped")
        _scheduler = None
