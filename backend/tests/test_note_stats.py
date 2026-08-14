"""Workspace counters come from the database, not from the loaded page."""
from datetime import datetime, timezone


def test_stats_route_is_not_swallowed_by_the_note_id_route(notes_client, monkeypatch):
    """/notes/stats must not be parsed as /notes/{id}."""
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_note_stats",
        lambda db, user_id: {"total": 42, "published": 7},
    )

    response = notes_client.get("/notes/stats")

    assert response.status_code == 200
    assert response.json()["total"] == 42
    assert response.json()["published"] == 7


def test_stats_response_defaults_are_zero(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(note_service, "get_note_stats", lambda db, user_id: {})

    body = notes_client.get("/notes/stats").json()

    assert body["total"] == 0
    assert body["tags"] == []
    assert body["languages"] == []


def test_stats_include_tag_and_language_histograms(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_note_stats",
        lambda db, user_id: {
            "total": 3,
            "tags": [{"tag": "fastapi", "count": 2}, {"tag": "sql", "count": 1}],
            "languages": [{"language": "python", "count": 1}],
        },
    )

    body = notes_client.get("/notes/stats").json()

    assert body["tags"][0] == {"tag": "fastapi", "count": 2}
    assert body["languages"] == [{"language": "python", "count": 1}]


def test_activity_route_is_reachable_and_bounded(notes_client, monkeypatch):
    from app.services import note_service

    captured = {}

    def fake_activity(db, user_id, weeks):
        captured["weeks"] = weeks
        return {"weeks": weeks, "since": "2026-01-01", "days": []}

    monkeypatch.setattr(note_service, "get_activity", fake_activity)

    assert notes_client.get("/notes/activity?weeks=12").status_code == 200
    assert captured["weeks"] == 12


def test_activity_weeks_are_clamped(monkeypatch):
    """An unbounded weeks value would scan the whole table."""
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_activity", lambda db, user_id, since: []
    )

    assert note_service.get_activity(None, user_id=1, weeks=9999)["weeks"] == (
        note_service.MAX_ACTIVITY_WEEKS
    )
    assert note_service.get_activity(None, user_id=1, weeks=0)["weeks"] == 1
    assert note_service.get_activity(None, user_id=1, weeks=26)["weeks"] == 26


def test_activity_since_is_derived_from_weeks(monkeypatch):
    from app.services import note_service

    captured = {}

    def fake(db, user_id, since):
        captured["since"] = since
        return []

    monkeypatch.setattr(note_service.note_repo, "get_activity", fake)

    note_service.get_activity(None, user_id=1, weeks=4)

    delta = datetime.now(timezone.utc) - captured["since"]
    assert 27 <= delta.days <= 28


def test_community_stats_route(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_community_stats",
        lambda db: {
            "notes": 5,
            "views": 90,
            "likes": 12,
            "authors": 3,
            "topics": [{"tag": "docker", "count": 4}],
        },
    )

    body = notes_client.get("/notes/community/stats").json()

    assert body["notes"] == 5
    assert body["authors"] == 3
    assert body["topics"] == [{"tag": "docker", "count": 4}]
