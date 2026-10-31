from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.core.logging import setup_logging
from app.routers import health, leave_requests, staff


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield
    engine.dispose()


def error_handler(status_code: int):
    """Build a handler that turns a domain error into a JSON response with this status."""

    async def handle_error(request: Request, error: Exception):
        return JSONResponse(status_code=status_code, content={"detail": str(error)})

    return handle_error


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health.router)
app.include_router(staff.router)
app.include_router(leave_requests.router)

app.add_exception_handler(NotFoundError, error_handler(status.HTTP_404_NOT_FOUND))
app.add_exception_handler(ConflictError, error_handler(status.HTTP_409_CONFLICT))
app.add_exception_handler(PermissionDeniedError, error_handler(status.HTTP_403_FORBIDDEN))
