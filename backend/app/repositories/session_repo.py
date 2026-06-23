from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user_session import UserSession


def create(
    db: Session,
    *,
    session_id: str,
    user_id: int,
    refresh_token_hash: str,
    expires_at: datetime,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> UserSession:
    session = UserSession(
        id=session_id,
        user_id=user_id,
        refresh_token_hash=refresh_token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_active(db: Session, *, session_id: str) -> UserSession | None:
    now = datetime.now(timezone.utc)
    return (
        db.query(UserSession)
        .filter(
            UserSession.id == session_id,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
        .first()
    )


def rotate(
    db: Session,
    *,
    session: UserSession,
    refresh_token_hash: str,
    expires_at: datetime,
) -> UserSession:
    session.refresh_token_hash = refresh_token_hash
    session.expires_at = expires_at
    db.commit()
    db.refresh(session)
    return session


def revoke(db: Session, *, session: UserSession) -> UserSession:
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def revoke_all_for_user(db: Session, *, user_id: int) -> int:
    now = datetime.now(timezone.utc)
    updated = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .update({UserSession.revoked_at: now}, synchronize_session=False)
    )
    db.commit()
    return int(updated or 0)
