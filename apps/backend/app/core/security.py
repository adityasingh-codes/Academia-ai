from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.database import get_db
from app.models.models import User

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_context.verify(password, hashed_password)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    payload = {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_error = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication credentials", {"WWW-Authenticate": "Bearer"})
    try:
        subject = jwt.decode(token, get_settings().jwt_secret, algorithms=[get_settings().jwt_algorithm]).get("sub")
        user_id = UUID(subject) if subject else None
    except (JWTError, ValueError, TypeError):
        raise credentials_error
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise credentials_error
    return user
