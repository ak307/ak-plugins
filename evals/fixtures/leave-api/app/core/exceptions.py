"""Domain errors raised by services. main.py maps each one to an HTTP status code."""


class NotFoundError(Exception):
    """The requested record does not exist."""


class ConflictError(Exception):
    """The request clashes with the current state of the data."""


class PermissionDeniedError(Exception):
    """The caller is not allowed to do this action."""
