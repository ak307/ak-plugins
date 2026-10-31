from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.staff import Staff
from app.schemas.staff import StaffCreate


def get_staff(db: Session, staff_id: int) -> Staff:
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise NotFoundError("Staff not found")
    return staff


def create_staff(db: Session, data: StaffCreate) -> Staff:
    staff = Staff(email=data.email, full_name=data.full_name, is_manager=data.is_manager)
    db.add(staff)
    try:
        db.commit()
    except IntegrityError:
        # The only unique column is email. Catching the database error (instead of
        # checking first) also covers two requests arriving at the same time.
        db.rollback()
        raise ConflictError("A staff member with this email already exists") from None
    db.refresh(staff)
    return staff
