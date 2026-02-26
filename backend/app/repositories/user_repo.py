from sqlalchemy.orm import Session

from app.models.user import User


def get_by_email(db: Session, email: str) -> User | None:
    oUser = db.query(User).filter(User.email == email).first()
    return oUser

def get_by_id(db: Session, user_id: int) -> User | None:
    oUser = db.query(User).filter(User.id == user_id).first()
    return oUser

def create(db: Session, name: str, email: str, hashed_password: str) -> User:
    oUser = User(name=name, email=email, hashed_password=hashed_password)
    db.add(oUser)
    db.commit()
    db.refresh(oUser)
    return oUser