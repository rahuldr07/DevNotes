"""Profile links are rendered as anchors on a public page — validate them."""
import pytest
from pydantic import ValidationError


def _update(**fields):
    from app.schemas.user import UserProfileUpdate

    return UserProfileUpdate(**fields)


@pytest.mark.parametrize(
    "field",
    ["website_url", "github_url", "twitter_url", "avatar_url"],
)
def test_javascript_urls_are_rejected(field):
    """React neutralises these at render time, but a framework escape hatch
    is not where a data rule belongs."""
    with pytest.raises(ValidationError):
        _update(**{field: "javascript:alert(document.domain)"})


@pytest.mark.parametrize(
    "field",
    ["website_url", "github_url", "twitter_url", "avatar_url"],
)
def test_data_urls_are_rejected(field):
    with pytest.raises(ValidationError):
        _update(**{field: "data:text/html;base64,PHNjcmlwdD4="})


@pytest.mark.parametrize("value", ["ftp://example.com", "example.com", "//example.com", "http://"])
def test_non_http_links_are_rejected(value):
    with pytest.raises(ValidationError):
        _update(website_url=value)


def test_http_and_https_links_are_kept():
    assert _update(website_url="https://ada.example").website_url == "https://ada.example"
    assert _update(github_url="http://github.com/ada").github_url == "http://github.com/ada"


def test_links_are_trimmed_and_blanks_become_none():
    assert _update(website_url="  https://ada.example  ").website_url == "https://ada.example"
    assert _update(website_url="   ").website_url is None
    assert _update(website_url=None).website_url is None


def test_note_source_url_and_profile_links_agree():
    """Both surfaces are public anchors; they should not disagree on what a
    valid link is."""
    from app.schemas.note import NoteUpdate

    with pytest.raises(ValidationError):
        NoteUpdate(source_url="javascript:alert(1)")
    with pytest.raises(ValidationError):
        _update(website_url="javascript:alert(1)")


def test_bio_still_accepts_plain_text():
    assert _update(bio="  Backend engineer  ").bio == "Backend engineer"
    assert _update(bio="   ").bio is None


@pytest.mark.parametrize("value", ["ada", "ada-lovelace", "a1b2", "x" * 30])
def test_valid_usernames(value):
    assert _update(username=value).username == value


@pytest.mark.parametrize("value", ["ab", "-ada", "ada-", "ada--lovelace", "Ada Lovelace", "x" * 31])
def test_invalid_usernames(value):
    with pytest.raises(ValidationError):
        _update(username=value)
