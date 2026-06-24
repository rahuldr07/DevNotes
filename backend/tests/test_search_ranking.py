from types import SimpleNamespace

from app.repositories import note_repo


def _rankable_note(**overrides):
    base = {
        "id": 1,
        "title": "Docker Compose Debugging",
        "content": "FastAPI worker logs and postgres container notes",
        "tags": ["devops", "docker"],
        "note_type": "guide",
        "language": "yaml",
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_search_terms_keep_developer_tokens():
    assert note_repo._search_terms("FastAPI + C# docker-compose") == [
        "fastapi",
        "+",
        "c#",
        "docker-compose",
    ]


def test_fallback_search_score_weights_title_and_tags_over_body():
    terms = note_repo._search_terms("docker")
    title_hit = _rankable_note(id=1, title="Docker runbook", content="misc")
    tag_hit = _rankable_note(id=2, title="Containers", content="misc", tags=["docker"])
    body_hit = _rankable_note(id=3, title="Misc", content="docker docker docker", tags=[])

    assert note_repo._fallback_search_score(title_hit, terms) > note_repo._fallback_search_score(body_hit, terms)
    assert note_repo._fallback_search_score(tag_hit, terms) > note_repo._fallback_search_score(body_hit, terms)


def test_fallback_search_score_boosts_phrase_matches():
    terms = note_repo._search_terms("docker compose")
    phrase_hit = _rankable_note(title="Docker Compose Debugging")
    scattered_hit = _rankable_note(title="Docker Notes", content="compose file tips")

    assert note_repo._fallback_search_score(phrase_hit, terms) > note_repo._fallback_search_score(scattered_hit, terms)
