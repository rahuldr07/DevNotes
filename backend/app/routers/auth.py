"""
Auth Router — Authentication API endpoints (register + login).

Endpoints:
    POST /auth/register → Create a new user account
    POST /auth/login    → Authenticate and receive a JWT token

These are the only PUBLIC endpoints (no JWT required).
All other endpoints require authentication via Depends(get_current_user).

Flow: Router (THIS FILE) → Service (auth_service.py) → Repository (user_repo.py)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.rate_limit import limiter
from app.schemas.user import (
    CurrentUserResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserLogin,
)
from app.services import auth_service

# APIRouter groups related endpoints together.
# prefix="/auth" → all routes here start with /auth
# tags=["auth"] → groups them under "auth" in Swagger docs (/docs)
router = APIRouter(prefix="/auth", tags=["auth"])


# ════════════════════════════════════════════
#  POST /auth/register — Create a new user
# ════════════════════════════════════════════
@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, response: Response, user: UserCreate, db: Session = Depends(get_db)):
   return auth_service.register_user(db, email = user.email, name = user.name, password = user.password)
 # pass the params only if the fields are less than 5 fields else pass the schema itself


# ════════════════════════════════════════════
#  POST /auth/login — Authenticate & get JWT
# ════════════════════════════════════════════
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, response: Response, credentials: UserLogin, db: Session = Depends(get_db)):
   return auth_service.authenticate_user(db, credentials.email, credentials.password)


@router.get("/me", response_model=CurrentUserResponse, status_code=200)
def get_me(user=Depends(get_current_user)):
   return user


@router.post("/refresh", response_model=TokenResponse, status_code=200)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
   return auth_service.refresh_access_token(db, payload.refresh_token)


@router.post("/logout", status_code=204)
def logout(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
   auth_service.logout_refresh_token(db, payload.refresh_token)
   return None
