from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.models.leave_request import LeaveRequest, LeaveStatus
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestReview
from app.services import staff_service


def get_leave_request(
    db: Session, leave_request_id: int, for_update: bool = False
) -> LeaveRequest:
    """Load one leave request. `for_update` locks the row so two reviews cannot overlap."""
    leave_request = db.get(LeaveRequest, leave_request_id, with_for_update=for_update)
    if leave_request is None:
        raise NotFoundError("Leave request not found")
    return leave_request


def list_leave_requests(
    db: Session,
    staff_id: int | None = None,
    leave_status: LeaveStatus | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[LeaveRequest]:
    query = select(LeaveRequest).order_by(LeaveRequest.start_date.desc(), LeaveRequest.id.desc())

    if staff_id is not None:
        # Raises NotFoundError for an unknown staff id instead of silently returning nothing.
        staff_service.get_staff(db, staff_id)
        query = query.where(LeaveRequest.staff_id == staff_id)
    if leave_status is not None:
        query = query.where(LeaveRequest.status == leave_status)

    return list(db.scalars(query.limit(limit).offset(offset)))


def create_leave_request(db: Session, data: LeaveRequestCreate) -> LeaveRequest:
    staff_service.get_staff(db, data.staff_id)

    if _has_overlapping_leave(db, data.staff_id, data.start_date, data.end_date):
        raise ConflictError("These dates overlap with an existing pending or approved leave request")

    leave_request = LeaveRequest(
        staff_id=data.staff_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
    )
    db.add(leave_request)
    db.commit()
    db.refresh(leave_request)
    return leave_request


def approve_leave_request(
    db: Session, leave_request_id: int, data: LeaveRequestReview
) -> LeaveRequest:
    return _review_leave_request(db, leave_request_id, data, LeaveStatus.APPROVED)


def reject_leave_request(
    db: Session, leave_request_id: int, data: LeaveRequestReview
) -> LeaveRequest:
    return _review_leave_request(db, leave_request_id, data, LeaveStatus.REJECTED)


def _review_leave_request(
    db: Session, leave_request_id: int, data: LeaveRequestReview, new_status: LeaveStatus
) -> LeaveRequest:
    manager = staff_service.get_staff(db, data.manager_id)
    if not manager.is_manager:
        raise PermissionDeniedError("Only managers can approve or reject leave requests")

    leave_request = get_leave_request(db, leave_request_id, for_update=True)
    if leave_request.staff_id == manager.id:
        raise PermissionDeniedError("Managers cannot review their own leave requests")
    if leave_request.status != LeaveStatus.PENDING:
        raise ConflictError(f"Leave request has already been {leave_request.status.value}")

    leave_request.status = new_status
    leave_request.reviewed_by_id = manager.id
    leave_request.reviewed_at = datetime.now()
    leave_request.review_comment = data.comment
    db.commit()
    db.refresh(leave_request)
    return leave_request


def _has_overlapping_leave(db: Session, staff_id: int, start_date: date, end_date: date) -> bool:
    """Rejected requests don't count: those dates are free again."""
    query = (
        select(LeaveRequest.id)
        .where(LeaveRequest.staff_id == staff_id)
        .where(LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]))
        .where(LeaveRequest.start_date <= end_date)
        .where(LeaveRequest.end_date >= start_date)
        .limit(1)
    )
    return db.scalar(query) is not None
