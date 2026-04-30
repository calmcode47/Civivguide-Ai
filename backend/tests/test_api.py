from fastapi.testclient import TestClient

from app.main import create_app


def make_client() -> TestClient:
    return TestClient(create_app())


def test_health_endpoint_reports_backend_status() -> None:
    with make_client() as client:
        root_response = client.get("/")
        response = client.get("/api/health")

    assert root_response.status_code == 200
    assert root_response.headers["X-Request-ID"].startswith("req_")
    root_payload = root_response.json()["data"]
    assert root_payload["service"] == "civicmind-api"
    assert root_payload["health_path"] == "/api/health"
    assert response.status_code == 200
    assert response.headers["X-Request-ID"].startswith("req_")
    payload = response.json()["data"]
    assert payload["service"] == "civicmind-api"
    assert payload["backend_ready"] is True
    assert payload["firestore_mode"] in {"memory", "firestore"}


def test_timeline_endpoint_returns_india_focused_steps() -> None:
    with make_client() as client:
        response = client.get("/api/timeline")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total_steps"] >= 8
    assert data["phases"][0]["name"] == "Pre-Election"
    assert any(step["title"] == "Polling Day" for phase in data["phases"] for step in phase["steps"])


def test_suggestions_endpoint_respects_persona() -> None:
    with make_client() as client:
        response = client.get("/api/suggestions", params={"persona": "First-Time Voter"})

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["persona"] == "first-time voter"
    assert len(data["suggestions"]) >= 3


def test_chat_flow_persists_session_history() -> None:
    with make_client() as client:
        chat_response = client.post(
            "/api/chat",
            json={
                "message": "How do I use Form 6 to register?",
                "user_context": "First-Time Voter",
                "language": "en",
            },
        )

        assert chat_response.status_code == 200
        chat_data = chat_response.json()["data"]
        assert chat_data["intent"] == "registration"
        assert len(chat_data["suggestions"]) >= 1

        session_response = client.get(f"/api/sessions/{chat_data['session_id']}")
        assert session_response.status_code == 200
        session_payload = session_response.json()["data"]
        assert len(session_payload["messages"]) == 2
        assert session_payload["session"]["message_count"] == 2


def test_chat_endpoint_sanitizes_html_input_before_saving_history() -> None:
    with make_client() as client:
        chat_response = client.post(
            "/api/chat",
            json={
                "message": "<b>What documents should I carry on polling day?</b>",
                "user_context": "First-Time Voter",
                "stage_context": "Polling Day",
                "language": "en",
            },
        )

        session_id = chat_response.json()["data"]["session_id"]
        session_response = client.get(f"/api/sessions/{session_id}")

    assert chat_response.status_code == 200
    history = session_response.json()["data"]["messages"]
    assert history[0]["content"] == "What documents should I carry on polling day?"
    assert "<b>" not in history[0]["content"]


def test_chat_fallback_answers_documents_question_directly() -> None:
    with make_client() as client:
        chat_response = client.post(
            "/api/chat",
            json={
                "message": "What documents should I carry on polling day?",
                "user_context": "First-Time Voter",
                "stage_context": "Polling Day",
                "language": "en",
            },
        )

    assert chat_response.status_code == 200
    reply = chat_response.json()["data"]["reply"]
    assert "EPIC" in reply or "photo ID" in reply
    assert "Use this stage as your anchor" not in reply


def test_chat_endpoint_rejects_messages_above_length_cap() -> None:
    with make_client() as client:
        response = client.post(
            "/api/chat",
            json={
                "message": "x" * 2001,
                "user_context": "First-Time Voter",
                "language": "en",
            },
        )

    assert response.status_code == 422


def test_specialised_assistant_endpoints_return_payloads() -> None:
    with make_client() as client:
        plan_response = client.post(
            "/api/voting-plan",
            json={
                "registration_status": "Already registered and mostly ready",
                "location_context": "Voting from my home constituency",
                "planning_focus": "Booth verification and document checklist",
                "language": "en",
            },
        )
        ballot_response = client.post(
            "/api/ballot/decode",
            json={
                "term": "VVPAT",
                "context": "The paper audit trail display linked to the voting machine.",
                "category": "technology",
                "language": "en",
            },
        )

    assert plan_response.status_code == 200
    assert "plan_markdown" in plan_response.json()["data"]
    assert ballot_response.status_code == 200
    assert "explanation" in ballot_response.json()["data"]
