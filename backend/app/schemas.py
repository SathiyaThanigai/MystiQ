from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Questions
class QuestionCreate(BaseModel):
    text: str
    options: List[str]
    correct_answer: int
    difficulty: str = "medium"
    category: Optional[str] = None
    is_active: bool = True


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[int] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


class QuestionResponse(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_answer: int
    difficulty: str
    category: Optional[str]
    is_active: bool
    order_index: int


class QuestionForParticipant(BaseModel):
    id: int
    text: str
    options: List[str]


# Case Identities
class CaseIdentityCreate(BaseModel):
    case_number: int
    theme: str
    color_name: str
    color_hex: str
    icon: str
    first_clue: Optional[str] = None
    final_code: Optional[str] = None


class CaseIdentityUpdate(BaseModel):
    theme: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    icon: Optional[str] = None
    first_clue: Optional[str] = None
    final_code: Optional[str] = None
    is_active: Optional[bool] = None


class CaseIdentityResponse(BaseModel):
    id: int
    case_number: int
    theme: str
    color_name: str
    color_hex: str
    icon: str
    first_clue: Optional[str]
    final_code: Optional[str]
    is_active: bool


class CaseIdentityPublic(BaseModel):
    id: int
    case_number: int
    theme: str
    color_name: str
    color_hex: str
    icon: str


# Participant Session
class SessionResponse(BaseModel):
    session_token: str
    team_name: str
    stage: str
    correct_count: int
    wrong_count: int
    current_question_index: int
    quiz_completed: bool
    case_selected: bool
    assigned_case_id: Optional[int]
    clue_revealed: bool
    code_verified: bool
    code_attempts: int


class AnswerSubmit(BaseModel):
    question_id: int
    selected_answer: int


class AnswerResponse(BaseModel):
    correct: bool
    correct_count: int
    wrong_count: int
    quiz_completed: bool


class CaseSelectRequest(BaseModel):
    case_id: int


class CodeVerifyRequest(BaseModel):
    case_id: int
    code: str


class CodeVerifyResponse(BaseModel):
    verified: bool
    message: str


# Admin Dashboard
class DashboardStats(BaseModel):
    total_cases: int
    in_progress: int
    qualified: int
    verified: int
    total_questions: int


class ParticipantStatus(BaseModel):
    id: int
    session_token: str
    team_name: str
    assigned_case_id: Optional[int]
    case_theme: Optional[str]
    correct_count: int
    wrong_count: int
    quiz_completed: bool
    case_selected: bool
    clue_revealed: bool
    code_verified: bool
    code_attempts: int
    stage: str
    verification_time: Optional[datetime]
    created_at: Optional[datetime]


class BulkQuestionImport(BaseModel):
    questions: List[QuestionCreate]
