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
- Falls back to grounded built-in guidance if Gemini is not configured.

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
- Gemini API integration with deterministic fallback
- Firestore-backed session store with memory fallback
- SlowAPI rate limiting
- Pytest coverage for core API flows

## Google Services Used

### Gemini API

- Generates conversational explanations.
- Produces personalised voting plans.
- Simplifies election and ballot terminology.

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

- Firebase project id: `projects-fef16`
- Hosting URLs:
  - `https://projects-fef16.web.app`
  - `https://projects-fef16.firebaseapp.com`

### Backend Hosting Project

- Google Cloud project id: `august-now-472515-h2`
- Project number: `854444982376`
- Project name: `My Project 28346`
- Cloud Run region: `asia-south1`
- Cloud Run service name: `civicmind-api`

### Firestore Project

- Firestore data project: `projects-fef16`
- Access pattern: Cloud Run uses a Firestore service-account credential from Secret Manager or a mounted secret file

## Runtime Configuration

### Backend environment

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_CLOUD_PROJECT=august-now-472515-h2
FIRESTORE_PROJECT_ID=projects-fef16
FIRESTORE_CREDENTIALS_FILE=/secrets/firestore-service-account.json
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://projects-fef16.web.app,https://projects-fef16.firebaseapp.com
RATE_LIMIT_PER_MINUTE=30
SESSION_HISTORY_LIMIT=20
ENVIRONMENT=production
```

### Frontend environment

```env
VITE_API_BASE_URL=https://YOUR_CLOUD_RUN_URL
VITE_SITE_URL=https://projects-fef16.web.app
VITE_FIREBASE_API_KEY=AIzaSyB0A3P_ilohCTQ0rWJdUg8iOTIO1iKjaEk
VITE_FIREBASE_AUTH_DOMAIN=projects-fef16.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=projects-fef16
VITE_FIREBASE_STORAGE_BUCKET=projects-fef16.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=542866398385
VITE_FIREBASE_APP_ID=1:542866398385:web:a8971691743b6d92e71690
VITE_FIREBASE_MEASUREMENT_ID=G-24PVDN50KW
```

## Backend Design

### Core services

- `backend/app/services/assistant_service.py`
  - detects intent and persona
  - builds grounded prompts
  - returns deterministic fallback guidance when Gemini is unavailable

- `backend/app/services/session_store.py`
  - supports Firestore and in-memory modes
  - allows split-project Firestore configuration
  - prefers explicit service-account credentials over ADC

- `backend/app/data/election_content.py`
  - stores India-specific timeline content, suggestions, and official references

### API surface

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

- `5 passed` in backend tests
- backend compile pass
- frontend production build pass
- tracked repository size: about `720K`, well under the `10 MB` limit

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
  --set-env-vars ENVIRONMENT=production,GEMINI_MODEL=gemini-2.0-flash,GOOGLE_CLOUD_PROJECT=august-now-472515-h2,FIRESTORE_PROJECT_ID=projects-fef16,ALLOWED_ORIGINS=https://projects-fef16.web.app,https://projects-fef16.firebaseapp.com \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,FIRESTORE_CREDENTIALS_FILE=FIRESTORE_SERVICE_ACCOUNT_PATH:latest
```

## Firebase Hosting Deployment Command

```bash
cd frontend
npm run build
firebase deploy --project projects-fef16 --only hosting
```

## Assumptions

- The assistant is intentionally non-partisan and process-focused.
- Users must verify live dates, booth locations, and constituency-specific instructions through official ECI channels.
- Guest mode is acceptable for the challenge submission; the backend still supports Firestore persistence when credentials are configured.
- The Firestore service-account JSON must stay out of git and should be mounted or injected through Secret Manager in production.

## Deployment Status

**Live deployment is not completed yet.**

As of **April 29, 2026**, two external blockers remain:

1. The Cloud Run host project `august-now-472515-h2` cannot enable `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, or `secretmanager.googleapis.com` because billing is not enabled on project number `854444982376`.
2. No Gemini API key has been provided in a deployable secret or environment value, so the backend cannot be deployed in the intended `gemini_ready=true` production state.

Because of those blockers, the final live URLs are still pending:

- Frontend URL: pending production deployment
- Backend URL: pending Cloud Run deployment

Once billing is enabled on `august-now-472515-h2` and a Gemini API key is supplied, the repo is ready for the final deploy-and-URL update pass.
