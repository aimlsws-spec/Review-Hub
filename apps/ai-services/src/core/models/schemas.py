"""Pydantic models mirroring the backend's AI-verification contract.

Field names intentionally match the Prisma/DTO shapes in
apps/backend/src/modules/ai and apps/backend/src/modules/task exactly
(camelCase) so payloads pass through with no field remapping.
"""
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class SubmissionTask(BaseModel):
    taskType: str


class Submission(BaseModel):
    id: str
    participantId: str
    taskId: str
    userId: str
    status: str
    verificationSource: str
    attemptNumber: int = 1
    fileUrl: Optional[str] = None
    externalUrl: Optional[str] = None
    textAnswer: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    task: Optional[SubmissionTask] = None


class VerificationJob(BaseModel):
    id: str
    submissionId: str
    status: str
    engine: Optional[str] = None
    model: Optional[str] = None
    retries: int = 0
    submission: Submission


class VerificationDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class AssistRequest(BaseModel):
    taskType: str
    campaignTitle: str
    campaignDescription: Optional[str] = None
    taskTitle: str
    taskInstructions: Optional[str] = None


class AssistResponse(BaseModel):
    suggestion: str
    source: str  # "llm" | "template"


class CompleteJobRequest(BaseModel):
    decision: VerificationDecision
    confidence: float
    fraudScore: Optional[float] = None
    explanation: Optional[str] = None
    rawResponse: Optional[dict[str, Any]] = None
    engine: Optional[str] = None
    model: Optional[str] = None
    processingTimeMs: Optional[int] = None
