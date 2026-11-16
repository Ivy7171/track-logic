/*
 * Track Logic - Audio Upload
 * Authors: Rasheda, Savian, Abel, and Shay
 * Course: ITFN 4154 - Informatics Integration
 * Date: November 2026
 */

'use strict';

const uploadToggle = document.getElementById('upload-toggle');
const uploadArea = document.getElementById('upload-area');

uploadToggle.addEventListener('click', () => {
    const opening = uploadArea.hidden;
    uploadArea.hidden = !opening;
    uploadToggle.setAttribute('aria-expanded', String(opening));
    uploadToggle.querySelector('strong').textContent = opening
        ? 'Analyze your audio file −'
        : 'Preview an audio file +';
});

(function setUpAudioForm() {
    const form = document.getElementById('upload-form');
    const status = document.getElementById('upload-status');
    const results = document.getElementById('own-results');
    const button = document.getElementById('upload-button');

    const audioFileInput = document.getElementById('own-audio');
    const preview = document.getElementById('audio-preview');
    const previewAudio = document.getElementById('preview-audio');
    const previewPlay = document.getElementById('preview-play');
    const previewProgress = document.getElementById('preview-progress');
    const previewTime = document.getElementById('preview-time');
    const previewName = document.getElementById('preview-name');
    const previewMessage = document.getElementById('preview-message');
    const previewLimit = 30;
    let previewUrl = null;
    let previewDuration = previewLimit;

    function formatPreviewTime(seconds) {
        const wholeSeconds = Math.floor(Math.max(0, seconds));
        return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
    }

    function updatePreviewProgress() {
        const current = Math.min(previewAudio.currentTime || 0, previewDuration);
        previewProgress.value = String(current);
        previewTime.textContent = `${formatPreviewTime(current)} / ${formatPreviewTime(previewDuration)}`;
        if (current >= previewDuration) {
            previewAudio.pause();
            previewPlay.textContent = 'Replay';
            previewPlay.setAttribute('aria-label', 'Replay song preview');
        }
    }

    audioFileInput.addEventListener('change', () => {
        previewAudio.pause();
        previewAudio.removeAttribute('src');
        previewAudio.load();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        preview.hidden = true;
        previewMessage.textContent = '';
        const file = audioFileInput.files[0];
        if (!file) return;

        previewUrl = URL.createObjectURL(file);
        previewAudio.src = previewUrl;
        previewName.textContent = file.name;
        previewDuration = previewLimit;
        previewProgress.max = String(previewLimit);
        previewProgress.value = '0';
        previewPlay.textContent = 'Play';
        previewPlay.setAttribute('aria-label', 'Play song preview');
        previewPlay.disabled = false;
        previewTime.textContent = '0:00 / 0:30';
        preview.hidden = false;
    });

    previewAudio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(previewAudio.duration) && previewAudio.duration > 0) {
            previewDuration = Math.min(previewLimit, previewAudio.duration);
            previewProgress.max = String(previewDuration);
        }
        updatePreviewProgress();
    });

    previewAudio.addEventListener('timeupdate', updatePreviewProgress);
    previewAudio.addEventListener('ended', () => {
        previewPlay.textContent = 'Replay';
        previewPlay.setAttribute('aria-label', 'Replay song preview');
    });
    previewAudio.addEventListener('error', () => {
        if (!previewUrl) return;
        previewMessage.textContent = 'This browser cannot play this audio format. Try an MP3, WAV, or M4A file.';
        previewPlay.disabled = true;
    });

    previewPlay.addEventListener('click', async () => {
        if (previewAudio.paused) {
            if (previewAudio.currentTime >= previewDuration - 0.05) previewAudio.currentTime = 0;
            try {
                await previewAudio.play();
                previewPlay.textContent = 'Pause';
                previewPlay.setAttribute('aria-label', 'Pause song preview');
                previewMessage.textContent = '';
            } catch (error) {
                previewMessage.textContent = 'Unable to play this file in your browser.';
            }
        } else {
            previewAudio.pause();
            previewPlay.textContent = 'Play';
            previewPlay.setAttribute('aria-label', 'Play song preview');
        }
    });

    previewProgress.addEventListener('input', () => {
        if (!Number.isFinite(previewAudio.duration)) return;
        previewAudio.currentTime = Math.min(Number(previewProgress.value), previewDuration);
        updatePreviewProgress();
    });

    window.addEventListener('pagehide', () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    });

    function escapeHtml(value) {
        const characters = {
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        };
        return String(value ?? '').replace(/[&<>"']/g, (character) => characters[character]);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        results.hidden = true;

        const file = document.getElementById('own-audio').files[0];
        if (!file) {
            status.textContent = 'Please choose your audio file.';
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            status.textContent = 'File is too large. Maximum file size: 100 MB.';
            return;
        }
        if (!document.getElementById('rights').checked) {
            status.textContent = 'Please confirm permission to analyze this recording.';
            return;
        }

        button.disabled = true;
        status.textContent = 'Running Essentia audio analysis. This may take a moment on free hosting…';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: new FormData(form),
                cache: 'no-store',
                credentials: 'omit'
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(typeof result.detail === 'string' ? result.detail : 'Analysis failed.');
            }

            const features = result.features;
            const comparison = result.comparison;
            const safe = escapeHtml;

            results.innerHTML = `
                <div class="analysis-card">
                    <span class="eyebrow">ESSENTIA AUDIO RESULTS</span>
                    <h3>${safe(result.title)}</h3>
                    <p>${safe(result.genre)} • ${safe(features.duration_seconds)} seconds analyzed</p>
                    <div class="own-grid">
                        <div><b>${safe(features.bpm)} BPM</b><span>Measured tempo</span></div>
                        <div><b>${safe(features.key)} ${safe(features.scale)}</b><span>Estimated musical key</span></div>
                    </div>
                    <h3>Compared with our study</h3>
                    <p><strong>${safe(comparison.tempo)}</strong></p>
                    <p>Average tempo: ${safe(comparison.hit_bpm)} BPM for ${safe(comparison.hit_count)} hits,
                        compared with ${safe(comparison.nonhit_bpm)} BPM for ${safe(comparison.nonhit_count)}
                        non-hits in ${safe(result.genre)}.</p>
                    <p>${safe(comparison.key_note)}</p>
                    <div class="next"><div>
                        <strong>WHAT SHOULD THE ARTIST DO NEXT?</strong>
                        <p>${safe(comparison.what_it_means)}</p>
                    </div></div>
                    <details>
                        <summary>Why aren't mood and danceability scored?</summary>
                        <p>${safe(comparison.limitations)}</p>
                    </details>
                    <p class="mini">Research-based comparisons, not a probability of commercial success.</p>
                </div>`;

            results.hidden = false;
            status.textContent = 'Your audio analysis is complete.';
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            status.textContent = error.message || 'Analysis failed.';
        } finally {
            button.disabled = false;
        }
    });
})();
