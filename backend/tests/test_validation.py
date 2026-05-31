import pytest
from pydantic import ValidationError


def test_user_create_requires_valid_email_and_strong_password():
    from app.schemas.user import UserCreate

    with pytest.raises(ValidationError):
        UserCreate(name="Ada", email="not-an-email", password="abc12345")

    with pytest.raises(ValidationError):
        UserCreate(name="Ada", email="ada@example.com", password="abcdefgh")

    with pytest.raises(ValidationError):
        UserCreate(name="Ada", email="ada@example.com", password="12345678")

    UserCreate(name="Ada", email="ada@example.com", password="abc12345")


def test_note_create_validates_title_content_and_tags():
    from app.schemas.note import NoteCreate

    with pytest.raises(ValidationError):
        NoteCreate(title="", content="Body")

    with pytest.raises(ValidationError):
        NoteCreate(title="x" * 201, content="Body")

    with pytest.raises(ValidationError):
        NoteCreate(title="Title", content="x" * 100001)

    with pytest.raises(ValidationError):
        NoteCreate(title="Title", content="Body", tags=[f"tag{i}" for i in range(11)])

    with pytest.raises(ValidationError):
        NoteCreate(title="Title", content="Body", tags=["x" * 31])

    NoteCreate(title="Title", content="Body", tags=["python"])


def test_note_update_validates_optional_fields_when_present():
    from app.schemas.note import NoteUpdate

    NoteUpdate()

    with pytest.raises(ValidationError):
        NoteUpdate(title="")

    with pytest.raises(ValidationError):
        NoteUpdate(tags=["x" * 31])
