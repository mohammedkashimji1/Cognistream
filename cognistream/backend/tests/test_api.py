import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def no_api_key(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)


def test_prepared_demo_and_custom_transcript_separation():
    a = client.post('/api/explain', json={'context':'Loss is squared error.', 'video_time':140, 'lesson_id':'demo'})
    assert a.status_code == 200
    assert a.json()['mode'] == 'prepared'
    assert '100' in a.json()['explanation']
    b = client.post('/api/explain', json={'context':'A database stores related data.', 'video_time':50, 'lesson_id':'custom'})
    assert b.json()['mode'] == 'extractive'
    assert b.json()['explanation'] == 'A database stores related data.'
    assert 'neural' not in b.json()['explanation']


def test_invalid_context_and_timestamp_rejected():
    for payload in [{'context':' ', 'video_time':1}, {'context':'x', 'video_time':-1}, {'context':'x'*12001, 'video_time':1}]:
        assert client.post('/api/explain', json=payload).status_code == 422


def test_online_and_failure_modes_are_explicit(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY','test-only-key')
    monkeypatch.setattr(main, 'generate_with_gemini', AsyncMock(return_value=main.TutorContent(explanation='Simple explanation.')))
    data={'context':'Some transcript.', 'video_time':0, 'lesson_id':'demo'}
    assert client.post('/api/explain',json=data).json()['mode'] == 'gemini'
    monkeypatch.setattr(main, 'generate_with_gemini', AsyncMock(side_effect=httpx.ReadTimeout('timeout')))
    response=client.post('/api/explain',json=data).json()
    assert response['mode']=='prepared'
    assert 'failed' in response['notice']
    assert 'test-only-key' not in str(response)


def test_health_does_not_expose_key(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY','private-test-key')
    response=client.get('/api/health').json()
    assert response['gemini_configured'] is True
    assert 'private-test-key' not in str(response)


def test_each_chapter_matches_manifest():
    import json
    manifest=json.loads((Path(main.__file__).resolve().parents[1]/'frontend/public/media/lesson.json').read_text())
    for chapter in manifest['chapters']:
        response=client.post('/api/explain',json={'context':'Sample lecture.', 'video_time':chapter['start']+.1,'lesson_id':'demo'}).json()
        assert response['explanation']==chapter['explanation']
        assert response['check_question']==chapter['check_question']
