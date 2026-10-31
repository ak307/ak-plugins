"""Import every model here so Alembic autogenerate can see all tables."""

from app.models.leave_request import LeaveRequest
from app.models.staff import Staff

__all__ = ["LeaveRequest", "Staff"]
