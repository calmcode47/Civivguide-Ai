# CivicMind

CivicMind is an India-focused election-process assistant built for Google Prompt Wars. It helps users understand voter enrolment, election timelines, nomination stages, polling-day flow, ballot terminology, and post-result process steps in a clear, interactive, non-partisan way.

## Chosen Vertical

**Civic accessibility and public-process guidance**

This project is designed for users who need reliable election-process help without reading dense legal or procedural material. The product focuses on clarity, step-by-step guidance, and strong official-source boundaries.

## What The Product Does

### 1. Election Assistant

- Answers free-form election-process questions.
- Adjusts guidance for `First-Time Voter`, `Returning Voter`, `Candidate`, and `Observer`.
- Avoids inventing live dates or constituency-specific facts.
- Uses a Gemini model chain first, then falls back to grounded built-in guidance if Gemini is unavailable or throttled.

### 2. Interactive Timeline

- Explains the Indian election process from schedule announcement to government formation.
- Includes detailed stage cards and AI deep links into the assistant.
- Preserves accessibility with keyboard-safe card navigation.

### 3. Voting Plan Generator

- Walks the user through a short planning flow.
- Produces a practical polling-day checklist.
- Pushes live verification back to official channels.

### 4. Ballot Decoder

- Explains terms such as `EVM`, `VVPAT`, `NOTA`, `constituency`, `candidate symbol`, and `affidavit`.
- Uses backend logic instead of static tooltip text alone.

### 5. Milestones Dashboard

- Shows election-readiness stages without assuming unofficial dates.
- Lets the user add an official polling date later for a personal countdown.

## Why This Fits The Challenge

- **Smart, dynamic assistant**: backend intent detection and persona-aware responses change the guidance path based on user context.
- **Logical decision making**: the assistant, suggestions, voting plan, and ballot decoder all branch according to user needs and election stage.
- **Google services integration**: Gemini, Firestore, Firebase Hosting, Google Analytics for Firebase, and Cloud Run are all integrated into the deployment design.
- **Practical usability**: the product supports both exploratory learning and task-based flows.
- **Clean code**: the backend is separated into routers, services, schemas, and tests; the frontend uses typed state and a clearer runtime config model.

## Architecture

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Three Fiber / Three.js
- Zustand
- Firebase Analytics

### Backend

- FastAPI
- Pydantic v2
- Gemini API integration with model-chain fallback plus deterministic fallback
- Firestore-backed session store with memory fallback
- SlowAPI rate limiting
- Pytest coverage for core API flows

## Google Services Used

### Gemini API

- Generates conversational explanations.
- Produces personalised voting plans.
- Simplifies election and ballot terminology.
- Tries a lightweight ordered model chain before dropping to deterministic local guidance.

### Firestore

- Stores sessions, conversation history, and feedback.
- Supports cross-project access from Cloud Run through service-account credentials.

### Firebase Hosting

- Hosts the frontend SPA.
- Uses `frontend/dist` as the deploy output.

### Firebase Analytics

- Initialised only in the browser and only in production-safe conditions.

### Cloud Run

- Hosts the FastAPI backend.
- Uses split-project deployment with Cloud Run in one GCP project and Firestore in another.

## Production Deployment Contract

### Frontend Hosting Project

- Firebase project id: `new--project-82b99`
- Hosting URLs:
  - `https://new--project-82b99.web.app`
  - `https://new--project-82b99.firebaseapp.com`

### Backend Hosting Project

- Google Cloud project id: `august-now-472515-h2`
- Project number: `854444982376`
- Project name: `My Project 28346`
- Cloud Run region: `asia-south1`
- Cloud Run service name: `civicmind-api`
- Backend URL: `https://civicmind-api-854444982376.asia-south1.run.app`

### Firestore Project

- Firestore data project: `new--project-82b99`
- Access pattern: Cloud Run uses a Firestore service-account credential from Secret Manager or a mounted secret file

## Runtime Configuration

### Backend environment

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODELS=gemini-2.0-flash,gemini-1.5-flash
# GEMINI_MODEL=gemini-2.0-flash
GEMINI_CHAT_MAX_OUTPUT_TOKENS=500
GEMINI_PLAN_MAX_OUTPUT_TOKENS=650
GEMINI_BALLOT_MAX_OUTPUT_TOKENS=300
GOOGLE_CLOUD_PROJECT=august-now-472515-h2
FIRESTORE_PROJECT_ID=new--project-82b99
FIRESTORE_CREDENTIALS_FILE=/secrets/firestore-service-account.json
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://new--project-82b99.web.app,https://new--project-82b99.firebaseapp.com
RATE_LIMIT_PER_MINUTE=30
SESSION_HISTORY_LIMIT=20
PROMPT_HISTORY_MESSAGE_LIMIT=6
ENVIRONMENT=production
```

### Frontend environment

```env
VITE_API_BASE_URL=https://civicmind-api-854444982376.asia-south1.run.app
VITE_SITE_URL=https://new--project-82b99.web.app
VITE_FIREBASE_API_KEY=AIzaSyB3L1O0T3BShynmaPlRP66o_EzQ_H4WIIA
VITE_FIREBASE_AUTH_DOMAIN=new--project-82b99.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=new--project-82b99
VITE_FIREBASE_STORAGE_BUCKET=new--project-82b99.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=623665232203
VITE_FIREBASE_APP_ID=1:623665232203:web:5a99fc4dff2c34f04550ce
VITE_FIREBASE_MEASUREMENT_ID=G-DQ8DX55P9Y
```

## Backend Design

### Core services

- `backend/app/services/assistant_service.py`
  - detects intent and persona
  - trims prompt history and applies task-specific token caps
  - returns deterministic fallback guidance when the Gemini model chain is unavailable

- `backend/app/services/session_store.py`
  - supports Firestore and in-memory modes
  - allows split-project Firestore configuration
  - prefers explicit service-account credentials over ADC

- `backend/app/services/gemini_service.py`
  - tries `gemini-2.0-flash` first and `gemini-1.5-flash` second by default
  - retries on quota, rate-limit, resource-exhausted, and model-unavailable style errors
  - preserves a final local fallback path through the assistant service

- `backend/app/data/election_content.py`
  - stores India-specific timeline content, suggestions, and official references

### API surface

- `GET /`
- `GET /api/health`
- `GET /api/timeline`
- `GET /api/suggestions`
- `POST /api/chat`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `DELETE /api/sessions/{session_id}`
- `POST /api/voting-plan`
- `POST /api/ballot/decode`
- `POST /api/translate`
- `POST /api/feedback`

## Local Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8080
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

## Verification Completed

The current codebase was re-verified locally on **April 29, 2026** with:

```bash
cd backend && pytest -q
cd backend && python3 -m compileall app tests
cd frontend && npm run build
git ls-files -z | xargs -0 du -ch 2>/dev/null | tail -n 1
```

Results:

- `9 passed` in backend tests
- backend compile pass
- frontend production build pass
- tracked repository size: about `812K`, well under the `10 MB` limit

Additional browser smoke checks were completed locally for:

- landing page rendering
- assistant chat
- assistant deep-link prefill flow
- timeline rendering
- milestone countdown flow

## Deployment Files Included

- [`firebase.json`](/Users/mayank/Downloads/Untitled/firebase.json)
- [`/.firebaserc`](/Users/mayank/Downloads/Untitled/.firebaserc)
- [`backend/.env.example`](/Users/mayank/Downloads/Untitled/backend/.env.example)
- [`frontend/.env.example`](/Users/mayank/Downloads/Untitled/frontend/.env.example)

## Cloud Run Deployment Command

The backend is prepared for a production deployment flow like this:

```bash
cd backend
gcloud run deploy civicmind-api \
  --source . \
  --project august-now-472515-h2 \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,GEMINI_MODELS=gemini-2.0-flash,gemini-1.5-flash,GEMINI_CHAT_MAX_OUTPUT_TOKENS=500,GEMINI_PLAN_MAX_OUTPUT_TOKENS=650,GEMINI_BALLOT_MAX_OUTPUT_TOKENS=300,PROMPT_HISTORY_MESSAGE_LIMIT=6,GOOGLE_CLOUD_PROJECT=august-now-472515-h2,FIRESTORE_PROJECT_ID=new--project-82b99,ALLOWED_ORIGINS=https://new--project-82b99.web.app,https://new--project-82b99.firebaseapp.com \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,FIRESTORE_CREDENTIALS_FILE=FIRESTORE_SERVICE_ACCOUNT_PATH:latest
```

## Firebase Hosting Deployment Command

```bash
cd frontend
npm run build
firebase deploy --project new--project-82b99 --only hosting
```

## Assumptions

- The assistant is intentionally non-partisan and process-focused.
- Users must verify live dates, booth locations, and constituency-specific instructions through official ECI channels.
- Guest mode is acceptable for the challenge submission; the backend still supports Firestore persistence when credentials are configured.
- The Firestore service-account JSON must stay out of git and should be mounted or injected through Secret Manager in production.

## Deployment Status

**Live deployment completed on April 29, 2026**

- Frontend URL: `https://new--project-82b99.web.app`
- Alternate frontend URL: `https://new--project-82b99.firebaseapp.com`
- Backend URL: `https://civicmind-api-854444982376.asia-south1.run.app`

Live checks completed after deployment:

- `GET /` returns the CivicMind API status payload instead of `404`
- `GET /api/health` returns `gemini_ready=true` and `firestore_project_id=new--project-82b99`
- a real browser-side assistant chat from the deployed frontend succeeded against the deployed backend
- Firestore-backed session records are being written in the new Firebase project

The backend and frontend use a low-cost deployment profile:

- Cloud Run stays scale-to-zero with `min-instances=0`
- Firebase Hosting serves the built SPA statically
- Gemini uses short prompts, capped output tokens, and a model-chain fallback before deterministic local guidance
