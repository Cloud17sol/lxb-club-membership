from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status, UploadFile, File, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
import hmac
import hashlib
import requests
import io
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Image as RLImage, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Paystack keys are now stored in DB and fetched dynamically via get_active_paystack_keys()

APP_NAME = "lxb-basketball-club"

async def get_payment_settings():
    """Get active payment settings from database"""
    settings = await db.payment_settings.find_one({}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = {
            "id": str(uuid.uuid4()),
            "paystack_mode": "test",
            "paystack_test_public_key": None,
            "paystack_test_secret_key": os.environ.get('PAYSTACK_SECRET_KEY', 'sk_test_placeholder'),
            "paystack_live_public_key": None,
            "paystack_live_secret_key": None,
            "callback_url": "/payment/callback",
            "webhook_secret": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": "system"
        }
        await db.payment_settings.insert_one(default_settings)
        return default_settings
    return settings

async def get_active_paystack_keys():
    """Get active Paystack secret key based on mode"""
    settings = await get_payment_settings()
    mode = settings.get("paystack_mode", "test")
    
    if mode == "live":
        secret_key = settings.get("paystack_live_secret_key")
        public_key = settings.get("paystack_live_public_key")
    else:
        secret_key = settings.get("paystack_test_secret_key")
        public_key = settings.get("paystack_test_public_key")
    
    # Fallback to environment or placeholder
    if not secret_key:
        secret_key = os.environ.get('PAYSTACK_SECRET_KEY', 'sk_test_placeholder')
    

# Local File Storage
UPLOADS_DIR = ROOT_DIR / "uploads"
PROFILE_UPLOADS_DIR = UPLOADS_DIR / "profiles"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def save_local_file(relative_path: str, data: bytes) -> Path:
    """Save file to local disk and return absolute path."""
    file_path = UPLOADS_DIR / relative_path
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return file_path


def get_local_file(path: str) -> Path:
    """Resolve a local uploaded file safely."""
    file_path = (UPLOADS_DIR / path).resolve()
    uploads_root = UPLOADS_DIR.resolve()
    if uploads_root not in file_path.parents and file_path != uploads_root:
        raise HTTPException(status_code=400, detail="Invalid file path")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return file_path

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    date_of_birth: str
    gender: str
    address: str
    player_position: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    full_name: str
    role: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    player_position: Optional[str] = None
    profile_image_url: Optional[str] = None

class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    full_name: str
    email: str
    phone: str
    date_of_birth: str
    gender: str
    address: str
    player_position: Optional[str] = None
    profile_image_url: Optional[str] = None
    membership_id: str
    role: str
    created_at: str

class DuesSettingUpdate(BaseModel):
    monthly_amount: float
    physical_card_amount: Optional[float] = None

class DuesSetting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    monthly_amount: float
    physical_card_amount: Optional[float] = 2000.0
    currency: str
    updated_at: str

class PaymentInitRequest(BaseModel):
    callback_url: str
    include_physical_card: bool = False

class PaymentInitResponse(BaseModel):
    authorization_url: str
    reference: str

class PaymentRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    amount: float
    currency: str
    month: int
    year: int
    status: str
    reference: str
    paystack_reference: str
    gateway: str = "paystack"
    mode: str = "test"
    include_physical_card: bool = False
    paid_at: Optional[str] = None
    created_at: str

class PaymentSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    paystack_mode: str  # "test" or "live"
    paystack_test_public_key: Optional[str] = None
    paystack_test_secret_key: Optional[str] = None
    paystack_live_public_key: Optional[str] = None
    paystack_live_secret_key: Optional[str] = None
    callback_url: str
    webhook_secret: Optional[str] = None
    updated_at: str
    updated_by: str

class PaymentSettingsUpdate(BaseModel):
    paystack_mode: Optional[str] = None
    paystack_test_public_key: Optional[str] = None
    paystack_test_secret_key: Optional[str] = None
    paystack_live_public_key: Optional[str] = None
    paystack_live_secret_key: Optional[str] = None
    callback_url: Optional[str] = None
    webhook_secret: Optional[str] = None

class PaymentSettingsSafe(BaseModel):
    """Safe version without secret keys for member view"""
    model_config = ConfigDict(extra="ignore")
    id: str
    paystack_mode: str
    callback_url: str
    updated_at: str

class MembershipCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    full_name: str
    membership_id: str
    status: str
    active_month: Optional[int] = None
    active_year: Optional[int] = None
    issue_date: str
    profile_image_url: Optional[str] = None

class MemberWithStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    full_name: str
    email: str
    phone: str
    membership_id: str
    payment_status: str
    last_payment_date: Optional[str] = None
    profile_image_url: Optional[str] = None
    created_at: str

class AdminStats(BaseModel):
    total_members: int
    active_members: int
    unpaid_members: int
    total_collected_this_month: float

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def generate_membership_id() -> str:
    return f"LXB-{uuid.uuid4().hex[:8].upper()}"

# Auth endpoints
@api_router.post("/auth/signup", response_model=Token)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    membership_id = generate_membership_id()
    hashed_pw = hash_password(user_data.password)
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_pw,
        "role": "member",
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    # Create profile
    profile_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "full_name": user_data.full_name,
        "email": user_data.email,
        "phone": user_data.phone,
        "date_of_birth": user_data.date_of_birth,
        "gender": user_data.gender,
        "address": user_data.address,
        "player_position": user_data.player_position,
        "profile_image_url": None,
        "membership_id": membership_id,
        "created_at": now
    }
    await db.profiles.insert_one(profile_doc)
    
    # Create membership card
    card_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "status": "inactive",
        "active_month": None,
        "active_year": None,
        "issue_date": now
    }
    await db.membership_cards.insert_one(card_doc)
    
    # Generate token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": "member"
        }
    }

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": profile["full_name"] if profile else "",
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": profile["full_name"] if profile else "",
        "role": current_user["role"]
    }

# Profile endpoints

# Admin password change
@api_router.put("/admin/change-password")
async def change_admin_password(data: PasswordChangeRequest, admin_user: dict = Depends(get_admin_user)):
    # Validate new password match
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match")
    
    # Enforce minimum password requirements
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    # Verify current password
    user = await db.users.find_one({"id": admin_user["id"]}, {"_id": 0})
    if not user or not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash and update
    new_hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"id": admin_user["id"]},
        {"$set": {"password": new_hashed}}
    )
    
    logger.info(f"Admin password changed for user {admin_user['id']}")
    return {"message": "Password updated successfully"}

@api_router.get("/profile", response_model=Profile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile["role"] = current_user["role"]
    return profile

@api_router.put("/profile", response_model=Profile)
async def update_profile(update_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": update_dict}
        )
    
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    profile["role"] = current_user["role"]
    return profile

# Image upload endpoint
@api_router.post("/upload/profile-image")
async def upload_profile_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read file data
    data = await file.read()
    
    # Limit file size to 1MB
    if len(data) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 1MB")
    
    # Generate local relative path (canonical format stored in DB)
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    relative_path = f"profiles/{current_user['id']}/{uuid.uuid4()}.{ext}"

    try:
        saved_path = save_local_file(relative_path, data)

        # Save ONLY the relative path to database (not the full URL)
        await db.profiles.update_one(
            {"user_id": current_user["id"]},
            {"$set": {"profile_image_url": relative_path}}
        )

        logger.info(f"Profile image uploaded successfully: {relative_path}")
        return {"path": relative_path, "size": len(data)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Serve uploaded files
@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    """Serve uploaded files from local disk - public access for images"""
    try:
        file_path = get_local_file(path)
        return FileResponse(file_path)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File serve failed for path {path}: {e}")
        raise HTTPException(status_code=404, detail="File not found")

# Dues endpoints
@api_router.get("/dues", response_model=DuesSetting)
async def get_dues(current_user: dict = Depends(get_current_user)):
    dues = await db.dues_settings.find_one({}, {"_id": 0})
    if not dues:
        # Create default
        dues_doc = {
            "id": str(uuid.uuid4()),
            "monthly_amount": 5000.0,
            "physical_card_amount": 2000.0,
            "currency": "NGN",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.dues_settings.insert_one(dues_doc)
        return dues_doc
    return dues

@api_router.put("/dues", response_model=DuesSetting)
async def update_dues(update_data: DuesSettingUpdate, admin_user: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.dues_settings.find_one({}, {"_id": 0})
    
    update_dict = {"updated_at": now}
    if update_data.monthly_amount is not None:
        update_dict["monthly_amount"] = update_data.monthly_amount
    if update_data.physical_card_amount is not None:
        update_dict["physical_card_amount"] = update_data.physical_card_amount
    
    if existing:
        await db.dues_settings.update_one(
            {"id": existing["id"]},
            {"$set": update_dict}
        )
        return await db.dues_settings.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        dues_doc = {
            "id": str(uuid.uuid4()),
            "monthly_amount": update_data.monthly_amount,
            "physical_card_amount": update_data.physical_card_amount or 2000.0,
            "currency": "NGN",
            "updated_at": now
        }
        await db.dues_settings.insert_one(dues_doc)
        return dues_doc

# Payment endpoints
@api_router.post("/payment/initialize", response_model=PaymentInitResponse)
async def initialize_payment(request_data: PaymentInitRequest, current_user: dict = Depends(get_current_user)):
    # Get dues amount
    dues = await db.dues_settings.find_one({}, {"_id": 0})
    if not dues:
        raise HTTPException(status_code=400, detail="Dues not configured")
    
    # Calculate total amount
    amount = dues["monthly_amount"]
    if request_data.include_physical_card:
        amount += dues.get("physical_card_amount", 0) or 0

    now = datetime.now(timezone.utc)
    month = now.month
    year = now.year
    
    # Check if already paid this month
    existing_payment = await db.payments.find_one({
        "user_id": current_user["id"],
        "month": month,
        "year": year,
        "status": "success"
    }, {"_id": 0})
    
    if existing_payment:
        raise HTTPException(status_code=400, detail="Already paid for this month")
    
    # Get active Paystack keys
    secret_key, public_key, mode = await get_active_paystack_keys()
    
    # Create payment record
    reference = f"lxb_{uuid.uuid4().hex[:16]}"
    payment_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "amount": amount,
        "currency": "NGN",
        "month": month,
        "year": year,
        "status": "pending",
        "reference": reference,
        "paystack_reference": reference,
        "gateway": "paystack",
        "mode": mode,
        "include_physical_card": request_data.include_physical_card,
        "paid_at": None,
        "created_at": now.isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    # Initialize Paystack transaction
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    amount_kobo = int(amount * 100)
    
    # Check if using placeholder key — no real Paystack keys configured
    if secret_key == "sk_test_placeholder" or not secret_key:
        logger.warning("Paystack keys not configured — using placeholder mode")
        return {
            "authorization_url": f"{request_data.callback_url}?reference={reference}&status=success",
            "reference": reference
        }
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.paystack.co/transaction/initialize",
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "email": current_user["email"],
                    "amount": amount_kobo,
                    "reference": reference,
                    "callback_url": request_data.callback_url,
                    "metadata": {
                        "user_id": current_user["id"],
                        "month": month,
                        "year": year,
                        "include_physical_card": request_data.include_physical_card,
                        "full_name": profile["full_name"] if profile else ""
                    }
                },
                timeout=15.0
            )
            result = response.json()
            
            if result.get("status"):
                # Update reference from Paystack if different
                ps_ref = result["data"]["reference"]
                if ps_ref != reference:
                    await db.payments.update_one(
                        {"reference": reference},
                        {"$set": {"paystack_reference": ps_ref}}
                    )
                return {
                    "authorization_url": result["data"]["authorization_url"],
                    "reference": ps_ref
                }
            else:
                # Paystack returned an error — mark payment as failed
                await db.payments.update_one(
                    {"reference": reference},
                    {"$set": {"status": "failed"}}
                )
                raise HTTPException(status_code=400, detail=result.get("message", "Payment initialization failed"))
    except httpx.RequestError as e:
        logger.error(f"Paystack network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach payment gateway. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Paystack init error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payment/verify/{reference}")
async def verify_payment(reference: str, current_user: dict = Depends(get_current_user)):
    # Try both reference and paystack_reference
    payment = await db.payments.find_one({"reference": reference}, {"_id": 0})
    if not payment:
        payment = await db.payments.find_one({"paystack_reference": reference}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] == "success":
        return {"status": "success", "message": "Payment already verified"}
    
    # Get active Paystack keys
    secret_key, _, mode = await get_active_paystack_keys()
    
    # Placeholder mode — auto-approve
    if secret_key == "sk_test_placeholder" or not secret_key:
        now = datetime.now(timezone.utc).isoformat()
        await db.payments.update_one(
            {"reference": payment["reference"]},
            {"$set": {"status": "success", "paid_at": now}}
        )
        await db.membership_cards.update_one(
            {"user_id": payment["user_id"]},
            {"$set": {
                "status": "active",
                "active_month": payment["month"],
                "active_year": payment["year"]
            }}
        )
        return {"status": "success", "message": "Payment verified (placeholder mode)"}
    
    # Verify with Paystack API
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers={"Authorization": f"Bearer {secret_key}"},
                timeout=15.0
            )
            result = response.json()
            
            if result.get("status") and result["data"]["status"] == "success":
                now = datetime.now(timezone.utc).isoformat()
                paystack_amount = result["data"].get("amount", 0) / 100  # kobo -> naira
                
                await db.payments.update_one(
                    {"reference": payment["reference"]},
                    {"$set": {
                        "status": "success",
                        "paid_at": now,
                        "paystack_reference": result["data"].get("reference", reference),
                        "verified_amount": paystack_amount
                    }}
                )
                
                # Update membership card
                await db.membership_cards.update_one(
                    {"user_id": payment["user_id"]},
                    {"$set": {
                        "status": "active",
                        "active_month": payment["month"],
                        "active_year": payment["year"]
                    }}
                )
                
                return {"status": "success", "message": "Payment verified successfully"}
            else:
                ps_status = result.get("data", {}).get("status", "unknown")
                if ps_status == "abandoned":
                    await db.payments.update_one(
                        {"reference": payment["reference"]},
                        {"$set": {"status": "failed"}}
                    )
                return {"status": "failed", "message": f"Payment not successful (status: {ps_status})"}
    except httpx.RequestError as e:
        logger.error(f"Paystack verify network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach payment gateway for verification")
    except Exception as e:
        logger.error(f"Paystack verify error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payment/webhook")
async def paystack_webhook(request: Request):
    signature = request.headers.get("x-paystack-signature")
    body = await request.body()
    
    # Get active Paystack secret key for signature verification
    secret_key, _, mode = await get_active_paystack_keys()
    
    # Also check webhook_secret override if set
    settings = await get_payment_settings()
    verify_key = settings.get("webhook_secret") or secret_key
    
    # Verify signature
    computed_signature = hmac.new(
        verify_key.encode('utf-8'),
        body,
        hashlib.sha512
    ).hexdigest()
    
    if not hmac.compare_digest(computed_signature, signature or ""):
        logger.warning("Webhook signature mismatch")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    event = await request.json()
    event_type = event.get("event")
    logger.info(f"Paystack webhook received: {event_type}")
    
    if event_type == "charge.success":
        reference = event["data"]["reference"]
        
        # Idempotency: find payment by paystack_reference or reference
        payment = await db.payments.find_one({"paystack_reference": reference}, {"_id": 0})
        if not payment:
            payment = await db.payments.find_one({"reference": reference}, {"_id": 0})
        
        if payment and payment["status"] != "success":
            now = datetime.now(timezone.utc).isoformat()
            paystack_amount = event["data"].get("amount", 0) / 100
            
            await db.payments.update_one(
                {"reference": payment["reference"]},
                {"$set": {
                    "status": "success",
                    "paid_at": now,
                    "paystack_reference": reference,
                    "verified_amount": paystack_amount
                }}
            )
            
            # Update membership card
            await db.membership_cards.update_one(
                {"user_id": payment["user_id"]},
                {"$set": {
                    "status": "active",
                    "active_month": payment["month"],
                    "active_year": payment["year"]
                }}
            )
            logger.info(f"Webhook: payment {reference} marked success for user {payment['user_id']}")
        elif payment and payment["status"] == "success":
            logger.info(f"Webhook: payment {reference} already verified (idempotent)")
        else:
            logger.warning(f"Webhook: no payment found for reference {reference}")
    
    return {"status": "ok"}

@api_router.get("/payment/history", response_model=List[PaymentRecord])
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

# Membership card endpoint
@api_router.get("/membership-card", response_model=MembershipCard)
async def get_membership_card(current_user: dict = Depends(get_current_user)):
    card = await db.membership_cards.find_one({"user_id": current_user["id"]}, {"_id": 0})
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not card or not profile:
        raise HTTPException(status_code=404, detail="Membership card not found")
    
    return {
        "id": card["id"],
        "user_id": card["user_id"],
        "full_name": profile["full_name"],
        "membership_id": profile["membership_id"],
        "status": card["status"],
        "active_month": card.get("active_month"),
        "active_year": card.get("active_year"),
        "issue_date": card["issue_date"],
        "profile_image_url": profile.get("profile_image_url")
    }

# Admin endpoints
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(admin_user: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Total members
    total_members = await db.users.count_documents({"role": "member"})
    
    # Active members (paid this month)
    active_payments = await db.payments.find({
        "month": current_month,
        "year": current_year,
        "status": "success"
    }).to_list(10000)
    
    active_user_ids = list(set([p["user_id"] for p in active_payments]))
    active_members = len(active_user_ids)
    
    # Total collected
    total_collected = sum([p["amount"] for p in active_payments])
    
    return {
        "total_members": total_members,
        "active_members": active_members,
        "unpaid_members": total_members - active_members,
        "total_collected_this_month": total_collected
    }

@api_router.get("/admin/members", response_model=List[MemberWithStatus])
async def get_all_members(admin_user: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    
    # Get all member users
    users = await db.users.find({"role": "member"}, {"_id": 0}).to_list(10000)
    
    members_with_status = []
    for user in users:
        profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
        if not profile:
            continue
        
        # Check payment status
        payment = await db.payments.find_one({
            "user_id": user["id"],
            "month": current_month,
            "year": current_year,
            "status": "success"
        }, {"_id": 0})
        
        # Get last payment
        last_payment = await db.payments.find_one(
            {"user_id": user["id"], "status": "success"},
            {"_id": 0},
            sort=[("paid_at", -1)]
        )
        
        members_with_status.append({
            "id": profile["id"],
            "user_id": user["id"],
            "full_name": profile["full_name"],
            "email": user["email"],
            "phone": profile["phone"],
            "membership_id": profile["membership_id"],
            "payment_status": "active" if payment else "inactive",
            "last_payment_date": last_payment["paid_at"] if last_payment else None,
            "profile_image_url": profile.get("profile_image_url"),
            "created_at": user["created_at"]
        })
    
    return members_with_status

@api_router.delete("/admin/members/{user_id}")
async def delete_member(user_id: str, admin_user: dict = Depends(get_admin_user)):
    # Delete user and related data
    await db.users.delete_one({"id": user_id})
    await db.profiles.delete_one({"user_id": user_id})
    await db.membership_cards.delete_one({"user_id": user_id})
    await db.payments.delete_many({"user_id": user_id})
    
    return {"message": "Member deleted successfully"}

@api_router.get("/admin/members/{user_id}", response_model=Profile)
async def get_member_details(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Get full member profile details for admin"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile["role"] = user["role"]
    return profile

@api_router.put("/admin/members/{user_id}", response_model=Profile)
async def update_member_details(user_id: str, update_data: ProfileUpdate, admin_user: dict = Depends(get_admin_user)):
    """Admin can edit any member's profile"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.profiles.update_one(
            {"user_id": user_id},
            {"$set": update_dict}
        )
    
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    profile["role"] = user["role"]
    return profile

@api_router.get("/admin/payments")
async def get_all_payments(
    admin_user: dict = Depends(get_admin_user),
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "date",
    sort_order: str = "desc",
    status: Optional[str] = None,
    search: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """Paginated, sortable, filterable payment records for admin"""
    # Clamp page_size
    page_size = max(10, min(page_size, 100))
    page = max(1, page)

    # Build MongoDB query filter
    query: dict = {}
    if status and status in ("success", "pending", "failed"):
        query["status"] = status
    if min_amount is not None:
        query.setdefault("amount", {})["$gte"] = min_amount
    if max_amount is not None:
        query.setdefault("amount", {})["$lte"] = max_amount
    if month is not None:
        query["month"] = month
    if year is not None:
        query["year"] = year
    if search:
        # Search by reference or paystack_reference
        query["$or"] = [
            {"reference": {"$regex": search, "$options": "i"}},
            {"paystack_reference": {"$regex": search, "$options": "i"}},
        ]

    # Sort mapping
    sort_field_map = {
        "reference": "reference",
        "amount": "amount",
        "period": "year",  # secondary sort by month handled below
        "status": "status",
        "date": "created_at",
    }
    mongo_sort_field = sort_field_map.get(sort_by, "created_at")
    mongo_sort_dir = -1 if sort_order == "desc" else 1

    # For period sorting, use compound sort (year then month)
    if sort_by == "period":
        sort_spec = [("year", mongo_sort_dir), ("month", mongo_sort_dir)]
    else:
        sort_spec = [(mongo_sort_field, mongo_sort_dir)]

    # Get total count for the query
    total_count = await db.payments.count_documents(query)
    total_pages = max(1, -(-total_count // page_size))  # ceil div

    # Fetch paginated records
    skip = (page - 1) * page_size
    payments = await db.payments.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(page_size).to_list(page_size)

    # Enrich with user info (name, email) for search display
    enriched = []
    # Cache user lookups
    user_cache: dict = {}
    for p in payments:
        uid = p.get("user_id")
        if uid and uid not in user_cache:
            profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0, "full_name": 1, "email": 1})
            user_cache[uid] = profile or {}
        profile_info = user_cache.get(uid, {})
        p["member_name"] = profile_info.get("full_name", "")
        p["member_email"] = profile_info.get("email", "")
        enriched.append(p)

    # If searching by member name/email, do a second pass
    if search and not enriched:
        # The $or above only matched reference — try name/email
        profiles = await db.profiles.find(
            {"$or": [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1}
        ).to_list(500)
        if profiles:
            user_ids = [pr["user_id"] for pr in profiles]
            name_query = {k: v for k, v in query.items() if k != "$or"}
            name_query["user_id"] = {"$in": user_ids}
            total_count = await db.payments.count_documents(name_query)
            total_pages = max(1, -(-total_count // page_size))
            payments = await db.payments.find(name_query, {"_id": 0}).sort(sort_spec).skip(skip).limit(page_size).to_list(page_size)
            enriched = []
            prof_map = {pr["user_id"]: pr for pr in profiles}
            for p in payments:
                pi = prof_map.get(p.get("user_id"), {})
                p["member_name"] = pi.get("full_name", "")
                p["member_email"] = pi.get("email", "")
                enriched.append(p)

    # Also compute summary stats for the filtered dataset
    pipeline = [{"$match": query}] if query else []
    pipeline.append({"$group": {
        "_id": None,
        "total": {"$sum": 1},
        "success_count": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}},
        "total_collected": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, "$amount", 0]}},
    }})
    agg_result = await db.payments.aggregate(pipeline).to_list(1)
    summary = agg_result[0] if agg_result else {"total": 0, "success_count": 0, "total_collected": 0}

    # Get distinct periods for filter dropdown
    periods_pipeline = [
        {"$group": {"_id": {"month": "$month", "year": "$year"}}},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
    ]
    period_results = await db.payments.aggregate(periods_pipeline).to_list(100)
    available_periods = [{"month": pr["_id"]["month"], "year": pr["_id"]["year"]} for pr in period_results]

    return {
        "records": enriched,
        "total_count": total_count,
        "current_page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": {
            "total_payments": summary.get("total", 0),
            "successful": summary.get("success_count", 0),
            "total_collected": summary.get("total_collected", 0),
        },
        "available_periods": available_periods,
    }

# Export endpoints
@api_router.get("/admin/export/csv")
async def export_members_csv(admin_user: dict = Depends(get_admin_user)):
    """Export members list to CSV"""
    try:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        # Get all member users
        users = await db.users.find({"role": "member"}, {"_id": 0}).to_list(10000)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Name', 'Membership ID', 'Email', 'Phone', 'Player Position', 'Payment Status', 'Last Payment Date', 'Created At'])
        
        # Write data
        for user in users:
            profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
            if not profile:
                continue
            
            # Check payment status
            payment = await db.payments.find_one({
                "user_id": user["id"],
                "month": current_month,
                "year": current_year,
                "status": "success"
            }, {"_id": 0})
            
            # Get last payment
            last_payment = await db.payments.find_one(
                {"user_id": user["id"], "status": "success"},
                {"_id": 0},
                sort=[("paid_at", -1)]
            )
            
            writer.writerow([
                profile.get("full_name", ""),
                profile.get("membership_id", ""),
                user.get("email", ""),
                profile.get("phone", ""),
                profile.get("player_position", ""),
                "Active" if payment else "Inactive",
                last_payment.get("paid_at", "Never") if last_payment else "Never",
                user.get("created_at", "")
            ])
        
        # Prepare response
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=lxb_members_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        logger.error(f"CSV export failed: {e}")
        raise HTTPException(status_code=500, detail="Export failed")

@api_router.get("/admin/export/pdf")
async def export_members_pdf(admin_user: dict = Depends(get_admin_user)):
    """Export members list to PDF with images"""
    try:
        now = datetime.now(timezone.utc)
        current_month = now.month
        current_year = now.year
        
        # Get all member users
        users = await db.users.find({"role": "member"}, {"_id": 0}).to_list(10000)
        
        # Create PDF in memory
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#FF5722'),
            spaceAfter=20,
        )
        elements.append(Paragraph("LXB Members Report", title_style))
        elements.append(Paragraph(f"Generated: {now.strftime('%B %d, %Y')}", styles['Normal']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Table data
        data = [['Photo', 'Name', 'Member ID', 'Email', 'Phone', 'Position', 'Status', 'Last Payment']]
        
        for user in users:
            profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
            if not profile:
                continue
            
            # Check payment status
            payment = await db.payments.find_one({
                "user_id": user["id"],
                "month": current_month,
                "year": current_year,
                "status": "success"
            }, {"_id": 0})
            
            # Get last payment
            last_payment = await db.payments.find_one(
                {"user_id": user["id"], "status": "success"},
                {"_id": 0},
                sort=[("paid_at", -1)]
            )
            
            # Handle profile image
            img_cell = ""
            if profile.get("profile_image_url"):
                try:
                    local_image_path = get_local_file(profile["profile_image_url"])

                    # Create PIL Image
                    pil_img = Image.open(local_image_path)
                    pil_img.thumbnail((40, 40))

                    # Save to BytesIO
                    img_buffer = io.BytesIO()
                    pil_img.save(img_buffer, format='PNG')
                    img_buffer.seek(0)

                    # Create ReportLab Image
                    img_cell = RLImage(img_buffer, width=30, height=30)
                except Exception as e:
                    logger.error(f"Failed to load image: {e}")
                    img_cell = "No Image"
            else:
                img_cell = "No Image"
            
            data.append([
                img_cell,
                profile.get("full_name", "")[:20],
                profile.get("membership_id", "")[-8:],
                user.get("email", "")[:25],
                profile.get("phone", "")[:15],
                profile.get("player_position", "")[:12],
                "Active" if payment else "Inactive",
                last_payment.get("paid_at", "Never")[:10] if last_payment else "Never"
            ])
        
        # Create table
        table = Table(data, colWidths=[0.6*inch, 1.2*inch, 1*inch, 1.8*inch, 1.2*inch, 1*inch, 0.8*inch, 1*inch])
        
        # Style table
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF5722')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#1A1A20')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#FF5722')),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#1A1A20'), colors.HexColor('#0F0F12')]),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=lxb_members_{datetime.now().strftime('%Y%m%d')}.pdf"}
        )
    except Exception as e:
        logger.error(f"PDF export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# Admin Payment Settings endpoints
@api_router.get("/admin/payment-settings")
async def get_admin_payment_settings(admin_user: dict = Depends(get_admin_user)):
    """Get full payment settings (admin only — includes secret keys)"""
    settings = await get_payment_settings()
    # Mask secret keys for display
    def mask_key(key):
        if not key or key == "sk_test_placeholder":
            return key
        return key[:7] + "****" + key[-4:] if len(key) > 12 else "****"
    
    return {
        "id": settings.get("id"),
        "paystack_mode": settings.get("paystack_mode", "test"),
        "paystack_test_public_key": settings.get("paystack_test_public_key") or "",
        "paystack_test_secret_key_masked": mask_key(settings.get("paystack_test_secret_key")),
        "paystack_live_public_key": settings.get("paystack_live_public_key") or "",
        "paystack_live_secret_key_masked": mask_key(settings.get("paystack_live_secret_key")),
        "callback_url": settings.get("callback_url", "/payment/callback"),
        "webhook_secret": settings.get("webhook_secret") or "",
        "has_test_keys": bool(settings.get("paystack_test_secret_key") and settings.get("paystack_test_secret_key") != "sk_test_placeholder"),
        "has_live_keys": bool(settings.get("paystack_live_secret_key")),
        "updated_at": settings.get("updated_at"),
        "updated_by": settings.get("updated_by", "system")
    }

@api_router.put("/admin/payment-settings")
async def update_admin_payment_settings(update_data: PaymentSettingsUpdate, admin_user: dict = Depends(get_admin_user)):
    """Update payment gateway settings (admin only)"""
    settings = await get_payment_settings()
    
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin_user.get("email", "admin")}
    
    if update_data.paystack_mode is not None:
        if update_data.paystack_mode not in ("test", "live"):
            raise HTTPException(status_code=400, detail="Mode must be 'test' or 'live'")
        update_dict["paystack_mode"] = update_data.paystack_mode
    
    if update_data.paystack_test_public_key is not None:
        update_dict["paystack_test_public_key"] = update_data.paystack_test_public_key
    if update_data.paystack_test_secret_key is not None:
        update_dict["paystack_test_secret_key"] = update_data.paystack_test_secret_key
    if update_data.paystack_live_public_key is not None:
        update_dict["paystack_live_public_key"] = update_data.paystack_live_public_key
    if update_data.paystack_live_secret_key is not None:
        update_dict["paystack_live_secret_key"] = update_data.paystack_live_secret_key
    if update_data.callback_url is not None:
        update_dict["callback_url"] = update_data.callback_url
    if update_data.webhook_secret is not None:
        update_dict["webhook_secret"] = update_data.webhook_secret
    
    await db.payment_settings.update_one(
        {"id": settings["id"]},
        {"$set": update_dict}
    )
    
    logger.info(f"Payment settings updated by {admin_user.get('email')}")
    return {"message": "Payment settings updated successfully"}

@api_router.get("/payment-settings/status")
async def get_payment_gateway_status(current_user: dict = Depends(get_current_user)):
    """Public-safe endpoint: tells members if payment gateway is configured"""
    secret_key, public_key, mode = await get_active_paystack_keys()
    is_configured = bool(secret_key and secret_key != "sk_test_placeholder")
    return {
        "mode": mode,
        "is_configured": is_configured,
        "public_key": public_key or ""
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db():
    
    # Create default admin user
    admin_exists = await db.users.find_one({"email": "admin@lxb.com"}, {"_id": 0})
    if not admin_exists:
        admin_id = str(uuid.uuid4())
        membership_id = generate_membership_id()
        hashed_pw = hash_password("admin123")
        now = datetime.now(timezone.utc).isoformat()
        
        admin_user_doc = {
            "id": admin_id,
            "email": "admin@lxb.com",
            "password": hashed_pw,
            "role": "admin",
            "created_at": now
        }
        await db.users.insert_one(admin_user_doc)
        
        admin_profile_doc = {
            "id": str(uuid.uuid4()),
            "user_id": admin_id,
            "full_name": "LXB Admin",
            "email": "admin@lxb.com",
            "phone": "+234000000000",
            "date_of_birth": "1990-01-01",
            "gender": "Other",
            "address": "LXB Headquarters",
            "player_position": None,
            "profile_image_url": None,
            "membership_id": membership_id,
            "created_at": now
        }
        await db.profiles.insert_one(admin_profile_doc)
        
        logger.info("Default admin created: admin@lxb.com / admin123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()