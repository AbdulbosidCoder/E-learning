import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .config import get_settings
from .database import Base, SessionLocal, engine
from .models import Role, User
from .routers import auth, courses, users
from .security import hash_password


def create_first_admin() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        if db.scalar(select(User).limit(1)):
            return
        db.add(
            User(
                email=settings.admin_email.strip().lower(),
                full_name="Administrator",
                password_hash=hash_password(settings.admin_password),
                role=Role.admin,
            )
        )
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    create_first_admin()
    yield


settings = get_settings()
os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(title="E-Learning", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(courses.router)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
