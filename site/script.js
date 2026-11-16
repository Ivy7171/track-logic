/*
 * Track Logic - Song Search and Research Comparison
 * Authors: Rasheda, Savian, Abel, and Shay
 * Course: ITFN 4154 - Informatics Integration
 * Date: November 2026
 */

'use strict';

const { songs, metrics } = window.TRACK_LOGIC_DATA;
const $ = (id) => document.getElementById(id);
const search = $('song-search');
const suggestions = $('suggestions');
let selected = null;

function normalize(text) {
    return String(text).toLocaleLowerCase();
}

function hideSuggestions() {
    suggestions.hidden = true;
    search.setAttribute('aria-expanded', 'false');
}

function chooseSong(song) {
    selected = song;
    search.value = song.title + ' — ' + song.artist;
    $('selected-title').textContent = song.title;
    $('selected-sub').textContent = song.artist + ' · ' + song.genre;
    $('chosen').hidden = false;
    $('analyze').disabled = false;
    hideSuggestions();
}

function showSuggestions() {
    const query = normalize(search.value.trim());

    if (!query) {
        hideSuggestions();
        return;
    }

    const matches = songs.filter((song) => {
        const details = song.title + ' ' + song.artist + ' ' + song.genre;
        return normalize(details).includes(query);
    }).slice(0, 8);

    suggestions.replaceChildren();

    if (!matches.length) {
        const message = document.createElement('p');
        message.style.padding = '5px 12px';
        message.textContent = 'No songs found. Try another title or artist.';
        suggestions.append(message);
    }

    matches.forEach((song) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'option');

        const title = document.createElement('strong');
        title.textContent = song.title;

        const details = document.createElement('small');
        details.textContent = song.artist + ' · ' + song.genre;

        button.append(title, details);
        button.addEventListener('click', () => chooseSong(song));
        suggestions.append(button);
    });

    suggestions.hidden = false;
    search.setAttribute('aria-expanded', 'true');
}

search.addEventListener('input', () => {
    selected = null;
    $('chosen').hidden = true;
    $('analyze').disabled = true;
    showSuggestions();
});

search.addEventListener('focus', showSuggestions);

search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        hideSuggestions();
    }
    if (event.key === 'Enter' && !suggestions.hidden) {
        event.preventDefault();
        suggestions.querySelector('button')?.click();
    }
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) {
        hideSuggestions();
    }
});

function addMoodBar(label, value, category) {
    const line = document.createElement('div');
    line.className = 'barline';

    const heading = document.createElement('div');
    heading.className = 'barhead';

    const name = document.createElement('span');
    name.textContent = label;

    const score = document.createElement('strong');
    score.textContent = value.toFixed(3) + ' / 1.000';
    heading.append(name, score);

    const track = document.createElement('div');
    track.className = 'bartrack';

    const fill = document.createElement('div');
    fill.className = 'barfill ' + category;
    fill.style.width = Math.min(100, Math.max(0, value * 100)) + '%';

    track.append(fill);
    line.append(heading, track);
    $('mood-bars').append(line);
}

function revealComparison() {
    if (!selected) {
        return;
    }

    const song = selected;
    const group = metrics[song.genre];
    const hits = group.hits;
    const nonhits = group.nonhits;
    const mood = song.happy;
    const hitDistance = Math.abs(mood - hits.happy);
    const nonhitDistance = Math.abs(mood - nonhits.happy);
    const difference = hits.happy - nonhits.happy;
    const close = Math.abs(hitDistance - nonhitDistance) < 0.015;
    const genreSimilar = Math.abs(difference) < 0.025;

    $('start-panel').hidden = true;
    $('results').hidden = false;
    $('numbers').open = false;

    $('result-song').textContent = song.title + ' · ' + song.artist + ' · ' + song.genre;
    $('result-description').textContent =
        'These are comparisons with the ' + song.genre +
        ' songs in our research sample, not a prediction of whether the song will become a hit.';

    $('mood-bars').replaceChildren();
    addMoodBar('Selected song', mood, 'selected');
    addMoodBar('Hit-song average', hits.happy, 'hits');
    addMoodBar('Non-hit average', nonhits.happy, 'nonhits');

    let moodFinding;
    let genreFinding;
    let nextStep;

    if (genreSimilar) {
        moodFinding = 'In this genre, hits and non-hits had almost the same average mood score. This makes mood a weak way to distinguish them.';
        genreFinding = 'The average mood score for hit songs was ' + hits.happy.toFixed(3) +
            ', compared with ' + nonhits.happy.toFixed(3) +
            ' for non-hits. That difference is small, so we should not treat an upbeat sound as a sign of likely success.';
        nextStep = 'Do not make a promotion decision from the mood score. Compare listener reactions to this song with reactions to other tracks, then decide which deserves more promotion.';
    } else {
        if (close) {
            moodFinding = 'This song is almost equally close to the hit and non-hit averages on mood.';
        } else if (hitDistance < nonhitDistance) {
            moodFinding = 'On mood alone, this song is closer to the hit average than the non-hit average.';
        } else {
            moodFinding = 'On mood alone, this song is closer to the non-hit average than the hit average.';
        }

        genreFinding = 'In the ' + song.genre + ' songs studied, hits averaged ' +
            hits.happy.toFixed(3) + ' on the mood measure, compared with ' +
            nonhits.happy.toFixed(3) + ' for non-hits. ' +
            (difference > 0 ? 'Hits were more upbeat on average.' : 'Non-hits were slightly more upbeat on average.') +
            ' This is a group-level finding, not a rule for an individual song.';

        nextStep = hitDistance < nonhitDistance
            ? 'This is one promising similarity worth discussing, but it is not enough to justify a promotion budget. Get listener feedback and compare engagement before investing.'
            : 'Do not rule this song out because of a single metric. Test it with listeners and compare actual engagement with your other songs.';
    }

    $('mood-finding').textContent = moodFinding;
    $('genre-finding').textContent = genreFinding;
    $('genre-sample').textContent = 'Genre sample: ' + hits.n + ' hits and ' + nonhits.n + ' non-hits.';
    $('next-move').textContent = nextStep;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('analyze').addEventListener('click', revealComparison);

$('example').addEventListener('click', () => {
    if (songs.length) {
        chooseSong(songs.find((song) => song.genre === 'Rock') || songs[0]);
        $('analyze').focus();
    }
});

$('again').addEventListener('click', () => {
    $('results').hidden = true;
    $('start-panel').hidden = false;
    selected = null;
    search.value = '';
    $('chosen').hidden = true;
    $('analyze').disabled = true;
    search.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
