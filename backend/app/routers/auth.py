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
