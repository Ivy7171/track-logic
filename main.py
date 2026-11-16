"""
Track Logic - Song Analysis API
Authors: Rasheda, Savian, Abel, and Shay
Course: ITFN 4154 - Informatics Integration
Date: November 2026
"""

import json
import math
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
BASE = Path(__file__).resolve().parent
SITE = BASE / 'site'
BASELINES = json.loads((BASE / 'baselines.json').read_text())
GENRES = set(BASELINES)
MAX_BYTES = 100 * 1024 * 1024
MAX_EXCERPT_SECONDS = 90
app = FastAPI(title='Track Logic Song Analyzer', docs_url=None, redoc_url=None, openapi_url=None)

class SecurityHeaders(BaseHTTPMiddleware):

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'none'"
        return response
app.add_middleware(SecurityHeaders)

# Identify supported audio formats from the file signature.
def file_kind(head):
    if len(head) >= 12 and head[:4] == b'RIFF' and (head[8:12] == b'WAVE'):
        return 'wav'
    if head[:4] == b'fLaC':
        return 'flac'
    if head[:4] == b'OggS':
        return 'ogg'
    if head[:3] == b'ID3' or (len(head) >= 2 and head[0] == 255 and (head[1] & 224 == 224)):
        return 'mp3'
    if len(head) >= 12 and head[4:8] == b'ftyp':
        return 'm4a'
    return None

# Convert the uploaded recording and measure its musical properties.
def extract_essentia(audio_file, working_dir):
    wav = working_dir / 'sample.wav'
    try:
        result = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(audio_file), '-t', str(MAX_EXCERPT_SECONDS), '-ac', '1', '-ar', '44100', '-acodec', 'pcm_s16le', str(wav)], capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        raise ValueError('Audio conversion took too long. Try a shorter recording.')
    if result.returncode != 0 or not wav.exists():
        raise ValueError('Could not decode this recording. Try another MP3 or WAV file.')
    import essentia.standard as es
    import numpy as np
    signal = es.MonoLoader(filename=str(wav), sampleRate=44100)()
    seconds = len(signal) / 44100.0
    if seconds < 8:
        raise ValueError('Your recording must be at least 8 seconds long.')
    bpm, beats, confidence, _, _ = es.RhythmExtractor2013(method='degara')(signal)
    key, scale, strength = es.KeyExtractor()(signal)
    rms = float(np.sqrt(np.mean(np.asarray(signal, dtype=np.float64) ** 2)))
    loudness_db = 20 * math.log10(max(rms, 1e-09))
    return {'duration_seconds': round(seconds, 1), 'bpm': round(float(bpm), 1), 'key': str(key), 'scale': str(scale), 'key_strength': round(float(strength), 2), 'rms_dbfs': round(loudness_db, 1)}

# Compare measured audio with the genre averages in the study.
def compare(genre, features):
    base = BASELINES[genre]
    h, n = (base['hits'], base['nonhits'])
    bpm = features['bpm']
    dh, dn = (abs(bpm - h['bpm']), abs(bpm - n['bpm']))
    if abs(dh - dn) < 2:
        tempo = 'This tempo is similarly close to the hit and non-hit averages.'
    elif dh < dn:
        tempo = 'This tempo is closer to the hit-song average.'
    else:
        tempo = 'This tempo is closer to the non-hit average.'
    mode = features['scale'].lower()
    is_major = mode == 'major'
    hit_pct = 100 * (h['major'] if is_major else 1 - h['major'])
    non_pct = 100 * (n['major'] if is_major else 1 - n['major'])
    return {'tempo': tempo, 'hit_bpm': h['bpm'], 'nonhit_bpm': n['bpm'], 'hit_count': h['n'], 'nonhit_count': n['n'], 'key_note': f"{features['key']} {features['scale']} was estimated from the recording. In this genre, {hit_pct:.0f}% of hits and {non_pct:.0f}% of non-hits used the same major/minor mode.", 'what_it_means': 'These are similarities to songs in our research, not a hit probability or a recommendation to spend money. Ask listeners to compare this track with alternatives and check engagement before promotion.', 'limitations': 'The audio excerpt is analyzed with Essentia for tempo and key. We do not compare the audio to the workbook happiness or danceability values because those scores are not calibrated to a shared scale. Loudness is a descriptive technical measurement, not evidence of hit potential.'}

@app.get('/api/health')
def health():
    try:
        import essentia.standard as es
        ready = hasattr(es, 'MonoLoader') and hasattr(es, 'RhythmExtractor2013')
    except Exception:
        ready = False
    return {'status': 'ok' if ready else 'unavailable', 'essentia_ready': ready, 'audio_uploads_enabled': ready}

# Validate and analyze a temporary audio upload.
@app.post('/api/analyze')
async def analyze(title: str=Form(...), genre: str=Form(...), audio: UploadFile=File(...)):
    title = title.strip()
    if not title or len(title) > 120:
        raise HTTPException(400, 'Enter a song title up to 120 characters.')
    if genre not in GENRES:
        raise HTTPException(400, 'Select one of the four supported genres.')
    with tempfile.TemporaryDirectory(prefix='tl_') as directory:
        work = Path(directory)
        src = work / 'upload.audio'
        size = 0
        head = b''
        try:
            with src.open('wb') as f:
                while True:
                    chunk = await audio.read(262144)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise HTTPException(413, 'Maximum file size is 100 MB.')
                    if len(head) < 32:
                        head = (head + chunk)[:32]
                    f.write(chunk)
        finally:
            await audio.close()
        if not file_kind(head):
            raise HTTPException(415, 'Upload an MP3, WAV, FLAC, OGG, or M4A audio file.')
        try:
            features = extract_essentia(src, work)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(503, 'Audio analysis could not finish. Try a shorter MP3 or WAV file.') from exc
        return {'title': title, 'genre': genre, 'features': features, 'comparison': compare(genre, features)}
# Serve the project website from the site folder.
app.mount('/', StaticFiles(directory=str(SITE), html=True), name='site')
