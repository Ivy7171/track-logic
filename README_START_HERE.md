# Track Logic: Original interface + live Essentia upload

This version restores the original Track Logic screen, keeping **REVEAL MY SONG’S SPARK**, the expandable **Have your own song? Preview an audio file +** area, and the research comparison. The upload section now also collects the title and genre needed by the Python API.

## Deployment

1. Extract the ZIP. Push the files at the ZIP root (including Dockerfile, main.py, requirements.txt and site/) into a GitHub repository.
2. On Render, choose **New → Web Service**, connect that repository, choose **Docker**, and select the free instance if available.
3. Wait for Render to show **Live** and visit `https://YOUR-APP.onrender.com/api/health`. It should report `essentia_ready: true`.
4. Open the same base URL (without `/api/health`) and test an audio file. Do **not** open `site/index.html` with `file:///` because a Python backend is required.

**Important:** The interface matches the approved design, but live upload processing has not been verified on Render. Free service memory limits may affect Essentia analysis. The upload measures tempo and musical key only; the research search compares recorded mood scores. No hit probability is calculated.


IMPORTANT: Do not double-click site/index.html to test audio analysis.
The browser's file:/// address runs only the static interface, not Essentia.
Deploy the repository root (including Dockerfile and main.py) on Render as a Docker Web Service.
When live, visit https://YOUR-SERVICE.onrender.com to test the upload.
On the approved interface, click 'Have your own song? Preview an audio file +' to open the upload fields.
