from datetime import date, datetime
from enum import Enum as PythonEnum
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LeaveType(StrEnum):
    ANNUAL = "annual"
    SICK = "sick"
    UNPAID = "unpaid"
    OTHER = "other"


class LeaveStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


def _enum_values(enum_class: type[PythonEnum]) -> list[str]:
    """Store the lowercase values (e.g. "annual") in the database instead of member names."""
    return [member.value for member in enum_class]


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    leave_type: Mapped[LeaveType] = mapped_column(
        Enum(LeaveType, native_enum=False, length=20, values_callable=_enum_values)
    )
    start_date: Mapped[date]
    end_date: Mapped[date]
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[LeaveStatus] = mapped_column(
        Enum(LeaveStatus, native_enum=False, length=20, values_callable=_enum_values),
        default=LeaveStatus.PENDING,
    )
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"))
    reviewed_at: Mapped[datetime | None]
    review_comment: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
