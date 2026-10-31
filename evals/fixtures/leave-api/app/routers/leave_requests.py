from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.database import DbSession
from app.models.leave_request import LeaveStatus
from app.schemas.leave_request import (
    LeaveRequestCreate,
    LeaveRequestResponse,
    LeaveRequestReview,
)
from app.services import leave_request_service

router = APIRouter(prefix="/leave-requests", tags=["leave requests"])


@router.post("", response_model=LeaveRequestResponse, status_code=status.HTTP_201_CREATED)
def create_leave_request(data: LeaveRequestCreate, db: DbSession):
    return leave_request_service.create_leave_request(db, data)


@router.get("", response_model=list[LeaveRequestResponse])
def list_leave_requests(
    db: DbSession,
    staff_id: int | None = None,
    leave_status: Annotated[LeaveStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return leave_request_service.list_leave_requests(db, staff_id, leave_status, limit, offset)


@router.get("/{leave_request_id}", response_model=LeaveRequestResponse)
def get_leave_request(leave_request_id: int, db: DbSession):
    return leave_request_service.get_leave_request(db, leave_request_id)


@router.post("/{leave_request_id}/approve", response_model=LeaveRequestResponse)
def approve_leave_request(leave_request_id: int, data: LeaveRequestReview, db: DbSession):
    return leave_request_service.approve_leave_request(db, leave_request_id, data)


@router.post("/{leave_request_id}/reject", response_model=LeaveRequestResponse)
def reject_leave_request(leave_request_id: int, data: LeaveRequestReview, db: DbSession):
    return leave_request_service.reject_leave_request(db, leave_request_id, data)
