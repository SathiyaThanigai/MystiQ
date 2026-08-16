from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, Float
from sqlalchemy.sql import func
from .database import Base


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # List of 4 options
    correct_answer = Column(Integer, nullable=False)  # Index 0-3
    difficulty = Column(String(20), default="medium")
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CaseIdentity(Base):
    __tablename__ = "case_identities"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(Integer, unique=True, nullable=False)
    theme = Column(String(100), nullable=False)
    color_name = Column(String(50), nullable=False)
    color_hex = Column(String(7), nullable=False)
    icon = Column(String(100), nullable=False)
    first_clue = Column(Text, nullable=True)
    final_code = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ParticipantSession(Base):
    __tablename__ = "participant_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(100), unique=True, index=True, nullable=False)
    team_name = Column(String(100), nullable=False, default="")
    batch_number = Column(Integer, default=1)
    batch_name = Column(String(100), nullable=True)
    is_active_batch = Column(Boolean, default=True)  # False = archived from previous batch
    assigned_case_id = Column(Integer, nullable=True)
    quiz_questions = Column(JSON, nullable=True)
    quiz_answers = Column(JSON, default=list)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    current_question_index = Column(Integer, default=0)
    quiz_completed = Column(Boolean, default=False)
    case_selected = Column(Boolean, default=False)
    clue_revealed = Column(Boolean, default=False)
    code_verified = Column(Boolean, default=False)
    code_attempts = Column(Integer, default=0)
    verification_time = Column(DateTime(timezone=True), nullable=True)
    quiz_completion_time = Column(DateTime(timezone=True), nullable=True)
    stage = Column(String(50), default="lobby")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class EventSettings(Base):
    __tablename__ = "event_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)


# ===== LEVEL 2 MODELS =====

class Level2CaseFile(Base):
    __tablename__ = "level2_case_files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color_hex = Column(String(7), default="#dc2626")
    answer_text = Column(Text, nullable=True)  # Case solution/explanation
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Level2Suspect(Base):
    __tablename__ = "level2_suspects"

    id = Column(Integer, primary_key=True, index=True)
    case_file_id = Column(Integer, nullable=False)  # Belongs to a case file
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    motive = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    is_correct = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Level2Session(Base):
    __tablename__ = "level2_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(100), unique=True, index=True, nullable=False)
    team_name = Column(String(100), nullable=False, default="")
    selected_case_file_id = Column(Integer, nullable=True)
    stage = Column(String(50), default="lobby")  # lobby, reading, attempt1, attempt2, won, lost
    reading_start_time = Column(DateTime(timezone=True), nullable=True)
    attempt1_start_time = Column(DateTime(timezone=True), nullable=True)
    attempt1_suspect_id = Column(Integer, nullable=True)
    attempt1_correct = Column(Boolean, nullable=True)
    attempt2_start_time = Column(DateTime(timezone=True), nullable=True)
    attempt2_suspect_id = Column(Integer, nullable=True)
    attempt2_correct = Column(Boolean, nullable=True)
    solved_time = Column(DateTime(timezone=True), nullable=True)  # When they got it right
    rank = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Level2Settings(Base):
    __tablename__ = "level2_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
