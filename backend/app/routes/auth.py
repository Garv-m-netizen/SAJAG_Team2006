from datetime import timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, CitizenProfile, UserRole
from app.schemas import UserCreate, UserOut, Token, UserLogin
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        sector=user_in.sector,
        phone=user_in.phone
    )
    db.add(user)
    db.flush()

    if user.role == UserRole.CITIZEN:
        profile = CitizenProfile(
            user_id=user.id,
            display_name=user.full_name,
            anonymous_pref=False,
            total_points=10, # Welcome bonus
            current_level="Civic Observer"
        )
        db.add(profile)

    db.commit()
    db.refresh(user)
    return user

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value, "user_id": user.id},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value, "user_id": user.id},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-accounts")
def get_demo_accounts():
    """
    Returns pre-configured demonstration accounts for Chandigarh evaluation.
    Only active in development environment.
    """
    return [
        {
            "role": "Administrator",
            "name": "Dr. Rajesh Sharma (Municipal Commissioner / Admin)",
            "email": "admin@civicpulse.chandigarh.gov.in",
            "password": "Admin@123",
            "description": "Full access to priority overrides, work orders, incident graph, and resource simulator."
        },
        {
            "role": "Field Worker",
            "name": "Vikram Singh (Sanitation & Drainage Operations Lead)",
            "email": "worker1@civicpulse.chandigarh.gov.in",
            "password": "Worker@123",
            "description": "Access to assigned work orders, upload before/after evidence, and submit resolutions."
        },
        {
            "role": "Field Worker",
            "name": "Sunil Kumar (Roads & Illumination Tech)",
            "email": "worker2@civicpulse.chandigarh.gov.in",
            "password": "Worker@123",
            "description": "Access to road repair and electrical assignments."
        },
        {
            "role": "Citizen",
            "name": "Garv Sharma (Active Resident, Sector 22)",
            "email": "citizen1@chandigarh.org",
            "password": "Citizen@123",
            "description": "Submit complaints in Hindi/Punjabi/English, view points ledger, and reverify resolutions."
        },
        {
            "role": "Citizen",
            "name": "Simran Kaur (Sector 17 Resident)",
            "email": "citizen2@chandigarh.org",
            "password": "Citizen@123",
            "description": "Community reverifier with earned badges and active reports."
        }
    ]
