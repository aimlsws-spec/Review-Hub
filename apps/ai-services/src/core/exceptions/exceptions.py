class AiServiceError(Exception):
    """Base class for errors raised by this service's own code."""


class NoEvidenceFileError(AiServiceError):
    """Raised when the backend has no evidence file for a submission (404)."""

    def __init__(self, job_id: str):
        super().__init__(f"No evidence file available for job {job_id}")
        self.job_id = job_id
