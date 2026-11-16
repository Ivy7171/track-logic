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
        if (file.size > 12 * 1024 * 1024) {
            status.textContent = 'File is too large. Choose one under 12 MB.';
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
