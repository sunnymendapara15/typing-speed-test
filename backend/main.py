import json
import random
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SNIPPET_LIBRARY = [
    'The quick brown fox jumps over the lazy dog in a single fluent stride.',
    'Practice every day to turn ordinary words into an extraordinary typing symphony.',
    'Fast fingers focus on precision before the minutes add up on the clock.',
    'Sunlight filtered through the blinds as the typist chased every letter on the screen.',
    'Keep your eyes on the text and your rhythm will follow; consistency breeds speed.',
    'Each sentence feels lighter when you breathe calmly and trust muscular memory.',
    'Typing is a dance between the conscious mind and the reflexes of your fingertips.',
    'Challenge yourself with new passages so your accuracy stays sharp and confident.'
]

STORAGE_FILE = Path(__file__).parent / 'scores.json'
STORAGE_LOCK = threading.Lock()

app = FastAPI(
    title='Typing Speed Test API',
    description='Serves random typing snippets and archives completed WPM/accuracy results.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class TestResult(BaseModel):
    wpm: float = Field(..., ge=0)
    accuracy: float = Field(..., ge=0, le=100)
    timestamp: str


def _ensure_storage():
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not STORAGE_FILE.exists():
        STORAGE_FILE.write_text('[]', encoding='utf-8')


def _read_storage():
    _ensure_storage()
    try:
        with STORAGE_FILE.open('r', encoding='utf-8') as handle:
            payload = json.load(handle)
            if isinstance(payload, list):
                return payload
    except json.JSONDecodeError:
        pass
    return []


def _parse_timestamp(value: Optional[str]) -> datetime:
    if not value:
        return datetime.min
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return datetime.min


@app.get('/api/snippet')
async def get_snippet():
    return {'text': random.choice(SNIPPET_LIBRARY)}


@app.post('/api/results')
async def post_result(result: TestResult):
    with STORAGE_LOCK:
        entries = _read_storage()
        entries.append(result.dict())
        STORAGE_FILE.write_text(json.dumps(entries[-100:], indent=2), encoding='utf-8')
    return {'status': 'ok'}


@app.get('/api/best-scores')
async def get_best_scores():
    with STORAGE_LOCK:
        entries = _read_storage()

    best_wpm = max((entry.get('wpm', 0) for entry in entries), default=0)
    best_accuracy = max((entry.get('accuracy', 0) for entry in entries), default=0)
    recent = sorted(
        entries,
        key=lambda entry: _parse_timestamp(entry.get('timestamp')),
        reverse=True,
    )[:8]

    return {
        'best_wpm': round(best_wpm, 1) if isinstance(best_wpm, float) else best_wpm,
        'best_accuracy': round(best_accuracy, 1) if isinstance(best_accuracy, float) else best_accuracy,
        'history': recent,
    }
