"""
Auth Router — Authentication API endpoints (register + login).

Endpoints:
    POST /auth/register → Create a new user account
    POST /auth/login    → Authenticate and receive a JWT token

These are the only PUBLIC endpoints (no JWT required).
All other endpoints require authentication via Depends(get_current_user).

Flow: Router (THIS FILE) → Service (auth_service.py) → Repository (user_repo.py)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.services import auth_service

# APIRouter groups related endpoints together.
# prefix="/auth" → all routes here start with /auth
# tags=["auth"] → groups them under "auth" in Swagger docs (/docs)
router = APIRouter(prefix="/auth", tags=["auth"])


# ════════════════════════════════════════════
#  POST /auth/register — Create a new user
# ════════════════════════════════════════════
@router.post("/register", response_model=UserResponse, status_code=201)
def register(user: UserCreate, db: Session = Depends(get_db)):
   return auth_service.register_user(db, email = user.email, name = user.name, password = user.password)
 # pass the params only if the fields are less than 5 fields else pass the schema itself


# ════════════════════════════════════════════
#  POST /auth/login — Authenticate & get JWT
# ════════════════════════════════════════════
@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
   return auth_service.authenticate_user(db, credentials.email, credentials.password)
