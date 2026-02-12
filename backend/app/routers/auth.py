

from django.db import router
from fastapi import Depends, HTTPException
from requests import Session

from app.services.auth import create_access_token
from backend.dependencies import get_db
from backend.schemas.user import UserResponse
from backend.models.user import User


@router.post("/login")
def login(user: UserResponse, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": str(db_user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
