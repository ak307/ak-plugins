from fastapi import APIRouter, status

from app.core.database import DbSession
from app.schemas.staff import StaffCreate, StaffResponse
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(data: StaffCreate, db: DbSession):
    return staff_service.create_staff(db, data)


@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff(staff_id: int, db: DbSession):
    return staff_service.get_staff(db, staff_id)
