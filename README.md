# Track Logic

Song research and audio comparison prototype for ITFN 4154 - Informatics Integration (Fall 2026).

**Team:** Rasheda, Savian, Abel, and Shay  
**Project question:** Is there a formula for a hit song?

## What the application does

The website has two main activities:

1. **Search the research sample.** Select a song by title or artist and compare its recorded happy-mood value with hit and non-hit averages for that genre.
2. **Analyze an uploaded audio file.** Supply a title, genre, and recording you have permission to use. The Python server uses FFmpeg and Essentia to measure tempo and musical key, then compares these with the genre averages.

The application does not predict commercial success. The uploaded audio is processed in a temporary folder and is not added to the research sample.

## Project files

| File | Purpose |
| --- | --- |
| `site/index.html` | Website content and input fields |
| `site/styles.css` | Layout and colors |
| `site/script.js` | Song search and research comparison |
| `site/upload.js` | Audio upload form and result display |
| `site/data.js` | Song records and research averages |
| `main.py` | API endpoints, audio validation, and Essentia processing |
| `baselines.json` | Genre-based comparison averages |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | Container setup for Render |
| `render.yaml` | Render service configuration |

`data.js` is large because it contains the research records. Each song is on its own line for readability. It is not an external URL.

## Deploy to Render

1. Upload the project files to the **root** of the GitHub repository. Keep the `site` directory and its contents together.
2. Configure Render as a **Web Service** using the repository and Docker runtime.
3. Open the Render service URL after deployment. Use `/api/health` to check whether Essentia is available.
4. Test the song search and a permitted audio file using the deployed website.

Opening `site/index.html` directly on a computer will not run the Python upload API.

## Limits

Audio uploads are limited to 12 MB. The first 90 seconds are analyzed; recordings shorter than eight seconds are rejected. Free-tier hosting memory and cold starts can affect audio analysis.

The live upload service has not been verified on Render as part of this code cleanup.
