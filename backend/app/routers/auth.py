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
    UserProfileUpdate,
    UserResponse,
    UserLogin,
)
from app.services import auth_service, profile_service

# APIRouter groups related endpoints together.
# prefix="/auth" → all routes here start with /auth
# tags=["auth"] → groups them under "auth" in Swagger docs (/docs)
router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_COOKIE = "auth_token"
REFRESH_COOKIE = "devnotes_refresh_token"


def _cookie_secure(request: Request) -> bool:
   return request.url.scheme == "https"


def set_auth_cookies(request: Request, response: Response, tokens: dict) -> None:
   secure = _cookie_secure(request)
   response.set_cookie(
      ACCESS_COOKIE,
      tokens["access_token"],
      httponly=True,
      secure=secure,
      samesite="lax",
      path="/",
      max_age=60 * 30,
   )
   # Remember-me sessions get a persistent cookie sized to the refresh token
   # lifetime; otherwise a session cookie (no max_age) that dies with the
   # browser, even though the token itself stays valid server-side for 7 days.
   remember_me = bool(tokens.get("remember_me", False))
   refresh_max_age = (
      tokens.get("refresh_expires_in", 60 * 60 * 24 * auth_service.REFRESH_TOKEN_EXPIRE_DAYS)
      if remember_me
      else None
   )
   response.set_cookie(
      REFRESH_COOKIE,
      tokens["refresh_token"],
      httponly=True,
      secure=secure,
      samesite="lax",
      path="/",
      max_age=refresh_max_age,
   )


def clear_auth_cookies(response: Response) -> None:
   response.delete_cookie(ACCESS_COOKIE, path="/")
   response.delete_cookie(REFRESH_COOKIE, path="/")


def _refresh_token_from_request(
   request: Request,
   payload: RefreshTokenRequest | None,
) -> str | None:
   if payload and payload.refresh_token:
      return payload.refresh_token
   return request.cookies.get(REFRESH_COOKIE)


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
   tokens = auth_service.authenticate_user(
      db,
      credentials.email,
      credentials.password,
      user_agent=request.headers.get("user-agent"),
      ip_address=request.client.host if request.client else None,
      remember_me=credentials.remember_me,
   )
   set_auth_cookies(request, response, tokens)
   return tokens


@router.get("/me", response_model=CurrentUserResponse, status_code=200)
def get_me(user=Depends(get_current_user)):
   return user


@router.patch("/profile", response_model=CurrentUserResponse, status_code=200)
def update_profile(
   payload: UserProfileUpdate,
   user=Depends(get_current_user),
   db: Session = Depends(get_db),
):
   return profile_service.update_my_profile(
      db,
      user,
      **payload.model_dump(exclude_unset=True),
   )


@router.post("/refresh", response_model=TokenResponse, status_code=200)
def refresh_token(request: Request, response: Response, payload: RefreshTokenRequest | None = None, db: Session = Depends(get_db)):
   refresh_token_value = _refresh_token_from_request(request, payload)
   if not refresh_token_value:
      clear_auth_cookies(response)
      raise HTTPException(status_code=401, detail="Refresh token missing")

   tokens = auth_service.refresh_access_token(db, refresh_token_value)
   set_auth_cookies(request, response, tokens)
   return tokens


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, payload: RefreshTokenRequest | None = None, db: Session = Depends(get_db)):
   refresh_token_value = _refresh_token_from_request(request, payload)
   if refresh_token_value:
      auth_service.logout_refresh_token(db, refresh_token_value)
   clear_auth_cookies(response)
   return None
