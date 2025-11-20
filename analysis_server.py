"""FastAPI service that runs the network analyzer and exposes the results."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Header
from fastapi.middleware.cors import CORSMiddleware


from network_analyzer import NetworkAnalyzer

DATA_DIR = Path('public/data')
RESULT_FILE = DATA_DIR / 'network_analysis_results.json'
MINDMAP_FILE = DATA_DIR / 'network_mind_map.json'
TIMELINE_FILE = DATA_DIR / 'protocol_timeline_sample.json'
USERS_FILE = DATA_DIR / 'users.json'
SUPPORTED_EXTENSIONS = {'.pcap', '.pcapng'}

# === Authentication Settings ===
FAKE_TOKEN = "my-demo-token"
DEFAULT_USERS = {
    "admin": "password123"
}

app = FastAPI(title='Network Analyzer Service', version='1.0.0')

# --- User Data Management ---

def _load_users() -> Dict[str, str]:
    if not USERS_FILE.exists():
        return {}
    with USERS_FILE.open('r', encoding='utf-8') as f:
        return json.load(f)

def _save_users(users: Dict[str, str]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with USERS_FILE.open('w', encoding='utf-8') as f:
        json.dump(users, f, indent=2)

@app.on_event("startup")
def initialize_users():
    """Ensure the default user exists on startup."""
    if not USERS_FILE.exists():
        _save_users(DEFAULT_USERS)
    else:
        users = _load_users()
        # Add default user if not present, without overwriting existing users
        if 'admin' not in users:
            users['admin'] = DEFAULT_USERS['admin']
            _save_users(users)

# --- Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# --- Authentication Endpoints ---

def check_token(authorization: Optional[str] = Header(None)) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="請先登入")

    token = authorization.replace("Bearer ", "").strip()
    if token != FAKE_TOKEN:
        raise HTTPException(status_code=401, detail="Token 無效")

    return True


@app.post("/api/login")
def login(data: Dict[str, Any]) -> Dict[str, Any]:
    username = data.get("username")
    password = data.get("password")
    
    users = _load_users()

    if not username or not password or username not in users or users[username] != password:
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

    return {
        "access_token": FAKE_TOKEN,
        "token_type": "bearer",
    }

@app.post("/api/register")
def register(data: Dict[str, Any]) -> Dict[str, str]:
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="使用者名稱和密碼為必填項")

    users = _load_users()

    if username in users:
        raise HTTPException(status_code=400, detail="此使用者名稱已被註冊")

    users[username] = password
    _save_users(users)

    return {"message": "註冊成功，您現在可以登入"}

@app.post("/api/forgot-password")
def forgot_password(data: Dict[str, Any]) -> Dict[str, str]:
    username = data.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="請提供您的使用者名稱")

    users = _load_users()

    if username not in users:
        # To prevent user enumeration, we don't reveal if the user exists
        return {"message": "如果使用者存在，密碼重設指示已發送"}
    
    # In a real app, you would send an email. Here we simulate it.
    # For this demo, we won't actually change the password but just send a success message.
    print(f"Password reset requested for user: {username}. In a real app, an email would be sent.")
    
    return {"message": "如果使用者存在，密碼重設指示已發送"}


# --- Core Application Endpoints (Protected) ---

def _run_analysis(pcap_path: Path) -> Dict[str, Any]:
    capture_path = pcap_path
    temp_copy = None
    try:
        if not capture_path.exists():
            raise ValueError('PCAP file not found')

        try:
            str(capture_path).encode('ascii')
        except UnicodeEncodeError:
            with NamedTemporaryFile(delete=False, suffix=capture_path.suffix) as temp_handle:
                temp_handle.write(capture_path.read_bytes())
                temp_copy = Path(temp_handle.name)
            capture_path = temp_copy

        analyzer = NetworkAnalyzer(str(capture_path))
        if not analyzer.load_packets():
            message = analyzer.last_error or 'Failed to load packets'
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
def health_check(current_user: bool = Depends(check_token)) -> Dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/analysis')
def get_analysis(current_user: bool = Depends(check_token)) -> Dict[str, Any]:
    cached = _load_cached_results()
    if not cached:
        raise HTTPException(status_code=404, detail='No analysis has been generated yet')
    return {'analysis': cached}

@app.get('/api/timelines')
def get_timelines(current_user: bool = Depends(check_token)) -> Dict[str, Any]:
    fixture = _load_timeline_fixture()
    if not fixture:
        raise HTTPException(status_code=404, detail='No timeline data available')
    return fixture


@app.post('/api/analyze')
async def analyze_capture(
    file: UploadFile = File(...),
    current_user: bool = Depends(check_token),
) -> Dict[str, Any]:
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
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        temp_path.unlink(missing_ok=True)

    return {'analysis': results}
