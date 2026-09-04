from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, diagnostics, nodes, sessions, subjects
from app.core.config import get_settings

app = FastAPI(title="Cognitive Learning Platform", version="1.0.0")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173", "http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=get_settings().upload_dir, check_dir=False), name="uploads")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(subjects.router, prefix="/api/v1")
app.include_router(nodes.router, prefix="/api/v1/nodes", tags=["Nodes & Uploads"])
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(diagnostics.router, prefix="/api/v1/diagnostics", tags=["Diagnostics & Remediation"])
