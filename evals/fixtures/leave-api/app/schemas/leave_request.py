from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.leave_request import LeaveStatus, LeaveType


class LeaveRequestCreate(BaseModel):
    staff_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def check_end_date_is_not_before_start_date(self) -> "LeaveRequestCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")
        return self


class LeaveRequestReview(BaseModel):
    """Body for approving or rejecting a leave request."""

    manager_id: int
    comment: str | None = Field(default=None, max_length=500)


class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    reviewed_by_id: int | None
    reviewed_at: datetime | None
    review_comment: str | None
    created_at: datetime
