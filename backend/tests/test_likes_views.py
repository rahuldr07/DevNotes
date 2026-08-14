from datetime import datetime, timezone


def _community_note(**overrides):
    payload = {
        "id": 12,
        "author_name": "Grace Hopper",
        "title": "Community note",
        "content": "Body",
        "tags": [],
        "is_pinned": False,
        "share_uuid": "share-uuid",
        "is_published": True,
        "is_community": True,
        "like_count": 3,
        "view_count": 9,
        "created_at": datetime(2026, 1, 4, tzinfo=timezone.utc),
        "updated_at": None,
    }
    payload.update(overrides)
    return payload


def test_community_response_includes_like_and_view_counts(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_community_notes",
        lambda db, cursor=None, limit=20, viewer_id=None, query=None, tag=None, sort='recent': {
            "data": [_community_note()],
            "next_cursor": None,
        },
    )

    response = notes_client.get(
        "/notes/community",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    note = response.json()["data"][0]
    assert note["like_count"] == 3
    assert note["view_count"] == 9


def test_public_response_includes_like_and_view_counts(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_public_note",
        lambda db, share_uuid: _community_note(id=99, share_uuid=share_uuid),
    )

    response = notes_client.get("/notes/public/share-uuid")

    assert response.status_code == 200
    note = response.json()
    assert note["like_count"] == 3
    assert note["view_count"] == 9


def test_like_endpoint_toggles_like(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "toggle_like",
        lambda db, user_id, note_id: {"liked": True, "like_count": 4},
        raising=False,
    )

    response = notes_client.post(
        "/notes/12/like",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert response.json() == {"liked": True, "like_count": 4}


def test_community_feed_accepts_search_and_tag_filters(notes_client, monkeypatch):
    """Explore paginates, so filtering in the browser only ever searched the
    notes already scrolled into view."""
    from app.services import note_service

    captured = {}

    def fake_feed(db, cursor, limit, viewer_id, query, tag, sort):
        captured.update({"query": query, "tag": tag, "limit": limit})
        return {"data": [], "next_cursor": None}

    monkeypatch.setattr(note_service, "get_community_notes", fake_feed)

    response = notes_client.get("/notes/community?q=docker&tag=DevOps&limit=5")

    assert response.status_code == 200
    assert captured == {"query": "docker", "tag": "DevOps", "limit": 5}


def test_community_service_normalizes_the_tag_filter(monkeypatch):
    from app.services import note_service

    captured = {}

    def fake_repo(db, cursor, limit, viewer_id, search_query, tag, sort):
        captured.update({"search_query": search_query, "tag": tag})
        return []

    monkeypatch.setattr(note_service.note_repo, "get_community_notes", fake_repo)

    note_service.get_community_notes(None, viewer_id=1, query=" docker ", tag="  DevOps ")

    assert captured == {"search_query": " docker ", "tag": "devops"}


def test_community_service_treats_blank_filters_as_absent(monkeypatch):
    from app.services import note_service

    captured = {}

    def fake_repo(db, cursor, limit, viewer_id, search_query, tag, sort):
        captured.update({"tag": tag})
        return []

    monkeypatch.setattr(note_service.note_repo, "get_community_notes", fake_repo)

    note_service.get_community_notes(None, viewer_id=1, tag="   ")

    assert captured == {"tag": None}


def test_trending_feed_returns_one_ranked_page_without_a_cursor(monkeypatch):
    """Rank order cannot be paged by an id cursor — trending is a bounded
    leaderboard, not an endless scroll."""
    from app.services import note_service

    captured = {}

    def fake_repo(db, cursor, limit, viewer_id, search_query, tag, sort):
        captured["sort"] = sort
        return [{"id": index} for index in range(limit)]

    monkeypatch.setattr(note_service.note_repo, "get_community_notes", fake_repo)

    page = note_service.get_community_notes(
        None, viewer_id=1, limit=5, sort="trending"
    )

    assert captured["sort"] == "trending"
    assert len(page["data"]) == 5
    assert page["next_cursor"] is None


def test_recent_feed_keeps_id_cursor_pagination(monkeypatch):
    from app.services import note_service

    def fake_repo(db, cursor, limit, viewer_id, search_query, tag, sort):
        return [{"id": 100 - index} for index in range(limit)]

    monkeypatch.setattr(note_service.note_repo, "get_community_notes", fake_repo)

    page = note_service.get_community_notes(None, viewer_id=1, limit=3, sort="recent")

    assert len(page["data"]) == 3
    assert page["next_cursor"] == 98


def test_unknown_sort_values_fall_back_to_recent(monkeypatch):
    from app.services import note_service

    captured = {}

    def fake_repo(db, cursor, limit, viewer_id, search_query, tag, sort):
        captured["sort"] = sort
        return []

    monkeypatch.setattr(note_service.note_repo, "get_community_notes", fake_repo)

    note_service.get_community_notes(None, viewer_id=1, sort="; DROP TABLE notes")

    assert captured["sort"] == "recent"
