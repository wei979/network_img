"""FastAPI service that runs the network analyzer and exposes the results."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from network_analyzer import NetworkAnalyzer

DATA_DIR = Path('public/data')
RESULT_FILE = DATA_DIR / 'network_analysis_results.json'
MINDMAP_FILE = DATA_DIR / 'network_mind_map.json'
TIMELINE_FILE = DATA_DIR / 'protocol_timeline_sample.json'
SUPPORTED_EXTENSIONS = {'.pcap', '.pcapng'}

app = FastAPI(title='Network Analyzer Service', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


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
    return {'status': 'ok'}


@app.get('/api/analysis')
def get_analysis() -> Dict[str, Any]:
    cached = _load_cached_results()
    if not cached:
        raise HTTPException(status_code=404, detail='No analysis has been generated yet')
    return {'analysis': cached}


@app.get('/api/timelines')
def get_timelines() -> Dict[str, Any]:
    fixture = _load_timeline_fixture()
    if not fixture:
        raise HTTPException(status_code=404, detail='No timeline data available')
    return fixture


@app.post('/api/analyze')
async def analyze_capture(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ''
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail='Only pcap and pcapng files are supported')

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail='Upload is empty')

    with NamedTemporaryFile(delete=False, suffix=suffix) as handle:
        handle.write(data)
        temp_path = Path(handle.name)

    try:
        results = await asyncio.to_thread(_run_analysis, temp_path)
    except ValueError as exc:  # pragma: no cover - runtime safeguard
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        temp_path.unlink(missing_ok=True)

    return {'analysis': results}

