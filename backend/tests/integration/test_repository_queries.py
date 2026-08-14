"""Repository queries against real PostgreSQL.

Every assertion here exercises a code path the mocked suite cannot reach:
full-text ranking, the generated tsvector, array containment on tags,
`unnest` aggregates, and the pagination SQL.
"""
import pytest

from app.repositories import note_repo


@pytest.fixture
def author(make_user):
    return make_user(name="Ada", username="ada")


def test_search_finds_a_note_by_a_word_only_present_in_its_tags(
    db, author, make_note
):
    """The tag half of the search vector — untestable without Postgres."""
    make_note(
        author,
        title="Deployment checklist",
        content="Steps for shipping the service.",
        tags=["docker"],
    )
    db.flush()

    results = note_repo.search_notes(db, user_id=author.id, search_query="docker")

    assert [note.title for note in results] == ["Deployment checklist"]


def test_search_ranks_title_matches_above_body_matches(db, author, make_note):
    make_note(author, title="Postgres tuning", content="Unrelated prose.")
    make_note(author, title="Unrelated", content="A passing mention of postgres.")
    db.flush()

    results = note_repo.search_notes(db, user_id=author.id, search_query="postgres")

    assert len(results) == 2
    assert results[0].title == "Postgres tuning"


def test_search_uses_stemming(db, author, make_note):
    """`websearch_to_tsquery` + the english config, not a LIKE fallback."""
    make_note(author, title="Deploying services", content="How we deploy.")
    db.flush()

    assert note_repo.search_notes(db, user_id=author.id, search_query="deployment")


def test_search_only_returns_the_callers_own_notes(db, author, make_user, make_note):
    stranger = make_user(name="Grace", username="grace")
    make_note(stranger, title="Secret postgres notes", content="Private.")
    db.flush()

    assert note_repo.search_notes(db, user_id=author.id, search_query="postgres") == []


def test_search_offset_pagination_does_not_repeat_or_drop_rows(
    db, author, make_note
):
    """The bug this replaced: an id cursor over rank-ordered results."""
    for index in range(7):
        make_note(author, title=f"Postgres note {index}", content="postgres " * index)
    db.flush()

    first = note_repo.search_notes(
        db, user_id=author.id, search_query="postgres", limit=3, offset=0
    )
    second = note_repo.search_notes(
        db, user_id=author.id, search_query="postgres", limit=3, offset=3
    )
    third = note_repo.search_notes(
        db, user_id=author.id, search_query="postgres", limit=3, offset=6
    )

    ids = [note.id for note in (*first, *second, *third)]
    assert len(ids) == 7
    assert len(set(ids)) == 7, "no row may appear on two pages"


def test_search_filters_by_tag_type_and_language(db, author, make_note):
    make_note(
        author,
        title="Docker compose",
        content="services",
        tags=["devops"],
        note_type="snippet",
        language="yaml",
    )
    make_note(author, title="Docker prose", content="services", note_type="note")
    db.flush()

    by_tag = note_repo.search_notes(
        db, user_id=author.id, search_query="docker", tag="devops"
    )
    by_type = note_repo.search_notes(
        db, user_id=author.id, search_query="docker", note_type="snippet"
    )
    by_language = note_repo.search_notes(
        db, user_id=author.id, search_query="docker", language="yaml"
    )

    assert [note.title for note in by_tag] == ["Docker compose"]
    assert [note.title for note in by_type] == ["Docker compose"]
    assert [note.title for note in by_language] == ["Docker compose"]


def test_generated_vector_updates_when_a_note_is_edited(db, author, make_note):
    note = make_note(author, title="Old title", content="Old body", tags=[])
    db.flush()

    note.tags = ["kubernetes"]
    db.flush()

    assert note_repo.search_notes(db, user_id=author.id, search_query="kubernetes")


def test_tag_counts_aggregate_over_every_note(db, author, make_note):
    """`unnest` — the Postgres branch of get_tag_counts."""
    make_note(author, tags=["docker", "devops"])
    make_note(author, tags=["docker"])
    make_note(author, tags=[])
    db.flush()

    counts = note_repo.get_tag_counts(db, user_id=author.id)

    assert counts[0] == {"tag": "docker", "count": 2}
    assert {"tag": "devops", "count": 1} in counts


def test_note_stats_count_the_whole_workspace(db, author, make_note):
    make_note(author, is_published=True, is_listed=True, note_type="snippet")
    make_note(author, is_published=True, is_pinned=True)
    make_note(author, note_type="guide")
    db.flush()

    stats = note_repo.get_note_stats(db, user_id=author.id)

    assert stats["total"] == 3
    assert stats["published"] == 2
    assert stats["private"] == 1
    assert stats["pinned"] == 1
    assert stats["snippets"] == 1
    assert stats["guides"] == 1
    assert stats["listed"] == 1


def test_profile_listing_hides_published_but_unlisted_notes(
    db, author, make_note
):
    """The privacy rule: a share link is not a profile entry."""
    make_note(author, title="Listed", is_published=True, is_listed=True, share_uuid="a")
    make_note(
        author, title="Link only", is_published=True, is_listed=False, share_uuid="b"
    )
    make_note(author, title="Private", share_uuid=None)
    db.flush()

    rows = note_repo.get_public_notes_for_user(db, user_id=author.id)

    assert [row["title"] for row in rows] == ["Listed"]


def test_related_reading_hides_published_but_unlisted_notes(
    db, author, make_user, make_note
):
    source = make_note(
        author, title="Source", is_published=True, is_listed=True, share_uuid="src"
    )
    stranger = make_user(name="Grace", username="grace")
    make_note(
        stranger,
        title="Unlisted stranger note",
        is_published=True,
        is_listed=False,
        share_uuid="hidden",
    )
    make_note(
        stranger,
        title="Listed stranger note",
        is_published=True,
        is_listed=True,
        share_uuid="shown",
    )
    db.flush()

    related = note_repo.get_related_public_notes(db, note=source, limit=5)

    titles = [row["title"] for row in related]
    assert "Unlisted stranger note" not in titles
    assert "Listed stranger note" in titles


def test_related_reading_ships_previews_not_bodies(db, author, make_note):
    source = make_note(
        author, title="Source", is_published=True, is_listed=True, share_uuid="src"
    )
    make_note(
        author,
        title="Long",
        content="word " * 4000,
        is_published=True,
        is_listed=True,
        share_uuid="long",
    )
    db.flush()

    related = note_repo.get_related_public_notes(db, note=source, limit=5)

    assert related
    assert "content" not in related[0]
    assert len(related[0]["preview"]) < 400


def test_library_filters_run_in_sql(db, author, make_note):
    make_note(author, title="Pinned one", is_pinned=True)
    make_note(author, title="Public one", is_published=True)
    make_note(author, title="Snippet one", note_type="snippet")
    db.flush()

    pinned = note_repo.get_my_notes(db, user_id=author.id, library_filter="pinned")
    public = note_repo.get_my_notes(db, user_id=author.id, library_filter="public")
    private = note_repo.get_my_notes(db, user_id=author.id, library_filter="private")
    snippets = note_repo.get_my_notes(db, user_id=author.id, library_filter="snippets")

    assert [note.title for note in pinned] == ["Pinned one"]
    assert [note.title for note in public] == ["Public one"]
    assert len(private) == 2
    assert [note.title for note in snippets] == ["Snippet one"]


def test_library_sorts_pinned_first_then_by_key(db, author, make_note):
    make_note(author, title="Zebra")
    make_note(author, title="Alpha")
    make_note(author, title="Middle", is_pinned=True)
    db.flush()

    by_title = note_repo.get_my_notes(db, user_id=author.id, sort="title")

    assert by_title[0].title == "Middle", "pinned notes sort above everything"
    assert [note.title for note in by_title[1:]] == ["Alpha", "Zebra"]


def test_library_tag_filter_uses_array_containment(db, author, make_note):
    make_note(author, title="Tagged", tags=["docker", "devops"])
    make_note(author, title="Untagged", tags=[])
    db.flush()

    rows = note_repo.get_my_notes(db, user_id=author.id, tag="docker")

    assert [note.title for note in rows] == ["Tagged"]


def test_community_feed_search_and_trending_rank_in_sql(
    db, author, make_user, make_note
):
    reader = make_user(name="Reader", username="reader")
    quiet = make_note(
        author,
        title="Quiet docker note",
        content="docker",
        is_published=True,
        is_community=True,
        view_count=1,
    )
    loud = make_note(
        author,
        title="Popular docker note",
        content="docker",
        is_published=True,
        is_community=True,
        view_count=500,
    )
    make_note(author, title="Unrelated", content="kubernetes", is_published=True, is_community=True)
    db.flush()

    searched = note_repo.get_community_notes(
        db, viewer_id=reader.id, search_query="docker", limit=20
    )
    assert {row["title"] for row in searched} == {quiet.title, loud.title}

    trending = note_repo.get_community_notes(
        db, viewer_id=reader.id, sort="trending", limit=20
    )
    assert trending[0]["title"] == loud.title


def test_community_feed_reports_the_viewers_like_state(
    db, author, make_user, make_note
):
    from app.models.note_like import NoteLike

    reader = make_user(name="Reader", username="reader")
    note = make_note(author, is_published=True, is_community=True)
    db.add(NoteLike(note_id=note.id, user_id=reader.id))
    db.flush()

    for_reader = note_repo.get_community_notes(db, viewer_id=reader.id, limit=20)
    for_author = note_repo.get_community_notes(db, viewer_id=author.id, limit=20)

    assert for_reader[0]["liked_by_me"] is True
    assert for_reader[0]["like_count"] == 1
    assert for_author[0]["liked_by_me"] is False


def test_batched_like_counts_match_individual_counts(
    db, author, make_user, make_note
):
    from app.models.note_like import NoteLike

    reader = make_user(name="Reader", username="reader")
    first = make_note(author, is_published=True, is_community=True)
    second = make_note(author, is_published=True, is_community=True)
    db.add(NoteLike(note_id=first.id, user_id=reader.id))
    db.add(NoteLike(note_id=first.id, user_id=author.id))
    db.flush()

    batched = note_repo.get_like_counts(db, [first.id, second.id])

    assert batched == {
        first.id: note_repo.get_like_count(db, first.id),
        second.id: note_repo.get_like_count(db, second.id),
    }
    assert batched[first.id] == 2
    assert batched[second.id] == 0


def test_activity_aggregates_by_day(db, author, make_note):
    from datetime import datetime, timedelta, timezone

    make_note(author)
    make_note(author)
    db.flush()

    since = datetime.now(timezone.utc) - timedelta(weeks=4)
    days = note_repo.get_activity(db, user_id=author.id, since=since)

    assert sum(day["count"] for day in days) == 2
