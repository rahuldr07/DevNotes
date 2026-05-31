from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.profile import PublicProfileResponse
from app.services import profile_service


router = APIRouter(tags=["profiles"])


@router.get("/u/{username}", response_model=PublicProfileResponse, status_code=200)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    return profile_service.get_public_profile(db, username=username)
