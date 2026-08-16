import random
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from ..database import get_db
from ..models import Question, CaseIdentity, ParticipantSession, EventSettings
from ..schemas import (
    SessionResponse, AnswerSubmit, AnswerResponse,
    CaseSelectRequest, CodeVerifyRequest, CodeVerifyResponse,
    QuestionForParticipant, CaseIdentityPublic
)

router = APIRouter(prefix="/api/participant", tags=["participant"])


async def get_setting(db: AsyncSession, key: str) -> Optional[str]:
    result = await db.execute(select(EventSettings).where(EventSettings.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


# --- JOIN GAME ---

@router.post("/join")
async def join_game(
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Join the game with a session code and team name."""
    game_code = data.get("game_code", "").strip().upper()
    team_name = data.get("team_name", "").strip()

    if not game_code or not team_name:
        raise HTTPException(status_code=400, detail="Game code and team name are required.")

    # Check if lobby is open
    lobby_open = await get_setting(db, "lobby_open")
    if lobby_open != "true":
        raise HTTPException(status_code=403, detail="Lobby is not open yet. Wait for the organizer.")

    # Validate game code
    correct_code = await get_setting(db, "game_code")
    if not correct_code or game_code != correct_code.strip().upper():
        raise HTTPException(status_code=401, detail="Invalid session code. Access denied.")

    # Check if team name already exists
    existing = await db.execute(
        select(ParticipantSession).where(ParticipantSession.team_name == team_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This team name is already taken.")

    # Create session
    token = secrets.token_urlsafe(32)
    # Get current batch number
    batch_num = await get_setting(db, "batch_number")
    session = ParticipantSession(session_token=token, team_name=team_name, stage="lobby", batch_number=int(batch_num or "1"), is_active_batch=True)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session_token": session.session_token,
        "team_name": session.team_name,
        "stage": session.stage,
    }


# --- GAME STATUS ---

@router.get("/game-status")
async def get_game_status(
    db: AsyncSession = Depends(get_db),
    x_session_token: Optional[str] = Header(None)
):
    """Check if the game has started and lobby status."""
    game_started = await get_setting(db, "game_started")
    lobby_open = await get_setting(db, "lobby_open")
    is_started = game_started == "true"

    result = await db.execute(select(ParticipantSession))
    total = len(result.scalars().all())

    return {"game_started": is_started, "lobby_open": lobby_open == "true", "participants_waiting": total}


# --- SESSION ---

@router.post("/session", response_model=SessionResponse)
async def get_session(
    db: AsyncSession = Depends(get_db),
    x_session_token: Optional[str] = Header(None)
):
    if not x_session_token:
        raise HTTPException(status_code=401, detail="No session token")

    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        session_token=session.session_token,
        team_name=session.team_name,
        stage=session.stage,
        correct_count=session.correct_count,
        wrong_count=session.wrong_count,
        current_question_index=session.current_question_index,
        quiz_completed=session.quiz_completed,
        case_selected=session.case_selected,
        assigned_case_id=session.assigned_case_id,
        clue_revealed=session.clue_revealed,
        code_verified=session.code_verified,
        code_attempts=session.code_attempts,
    )


# --- QUIZ ---

@router.post("/start-quiz")
async def start_quiz(
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    # Check game started
    game_started = await get_setting(db, "game_started")
    if game_started != "true":
        raise HTTPException(status_code=403, detail="Game has not started yet. Please wait.")

    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.quiz_completed:
        raise HTTPException(status_code=400, detail="Quiz already completed")

    # If questions already assigned, return current state
    if session.quiz_questions and len(session.quiz_questions) > 0:
        session.stage = "quiz"
        await db.commit()
        return {"started": True, "questions_assigned": len(session.quiz_questions)}

    # Generate random questions
    q_result = await db.execute(
        select(Question).where(Question.is_active == True)
    )
    all_questions = q_result.scalars().all()

    if len(all_questions) < 5:
        raise HTTPException(status_code=400, detail="Not enough questions in the bank")

    # Select up to 20 questions randomly (enough for wrong answers)
    num_to_select = min(len(all_questions), 20)
    selected = random.sample(all_questions, num_to_select)
    question_ids = [q.id for q in selected]
    random.shuffle(question_ids)

    session.quiz_questions = question_ids
    session.stage = "quiz"
    session.current_question_index = 0
    await db.commit()

    return {"started": True, "questions_assigned": len(question_ids)}


@router.get("/current-question", response_model=Optional[QuestionForParticipant])
async def get_current_question(
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.quiz_completed:
        return None

    if not session.quiz_questions or session.current_question_index >= len(session.quiz_questions):
        # Need more questions
        q_result = await db.execute(
            select(Question).where(Question.is_active == True)
        )
        all_questions = q_result.scalars().all()
        used_ids = set(session.quiz_questions or [])
        available = [q for q in all_questions if q.id not in used_ids]

        if not available:
            available = all_questions

        new_selections = random.sample(available, min(len(available), 10))
        new_ids = [q.id for q in new_selections]
        random.shuffle(new_ids)

        current_questions = list(session.quiz_questions or [])
        current_questions.extend(new_ids)
        session.quiz_questions = current_questions
        await db.commit()

    question_id = session.quiz_questions[session.current_question_index]
    question = await db.get(Question, question_id)

    if not question:
        raise HTTPException(status_code=500, detail="Question data error")

    options = list(question.options)

    return QuestionForParticipant(
        id=question.id,
        text=question.text,
        options=options,
    )


@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(
    data: AnswerSubmit,
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.quiz_completed:
        raise HTTPException(status_code=400, detail="Quiz already completed")

    if not session.quiz_questions or session.current_question_index >= len(session.quiz_questions):
        raise HTTPException(status_code=400, detail="No current question")

    current_q_id = session.quiz_questions[session.current_question_index]
    if data.question_id != current_q_id:
        # Check if this question was already answered (retry protection)
        already_answered = any(
            a.get("question_id") == data.question_id for a in (session.quiz_answers or [])
        )
        if already_answered:
            # Return the previous result without re-processing
            prev = next(a for a in session.quiz_answers if a.get("question_id") == data.question_id)
            return AnswerResponse(
                correct=prev["correct"],
                correct_count=session.correct_count,
                wrong_count=session.wrong_count,
                quiz_completed=session.correct_count >= 5,
            )
        raise HTTPException(status_code=400, detail="Question mismatch")

    question = await db.get(Question, data.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = data.selected_answer == question.correct_answer

    answers = list(session.quiz_answers or [])
    answers.append({
        "question_id": data.question_id,
        "selected": data.selected_answer,
        "correct": is_correct
    })
    session.quiz_answers = answers

    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1

    session.current_question_index += 1

    if session.correct_count >= 5:
        session.quiz_completed = True
        session.quiz_completion_time = datetime.now(timezone.utc)
        session.stage = "case_unlock"

    await db.commit()

    return AnswerResponse(
        correct=is_correct,
        correct_count=session.correct_count,
        wrong_count=session.wrong_count,
        quiz_completed=session.correct_count >= 5,
    )


# --- CASES ---

@router.get("/cases")
async def get_case_identities(db: AsyncSession = Depends(get_db)):
    """Get all cases with taken status."""
    result = await db.execute(
        select(CaseIdentity).where(CaseIdentity.is_active == True).order_by(CaseIdentity.case_number)
    )
    all_cases = result.scalars().all()

    taken_result = await db.execute(
        select(ParticipantSession.assigned_case_id).where(
            ParticipantSession.case_selected == True,
            ParticipantSession.assigned_case_id != None,
            ParticipantSession.is_active_batch == True
        )
    )
    taken_case_ids = set(row[0] for row in taken_result.all())

    cases_response = []
    for c in all_cases:
        cases_response.append({
            "id": c.id,
            "case_number": c.case_number,
            "theme": c.theme,
            "color_name": c.color_name,
            "color_hex": c.color_hex,
            "icon": c.icon,
            "taken": c.id in taken_case_ids,
        })

    return cases_response


@router.post("/select-case")
async def select_case(
    data: CaseSelectRequest,
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.quiz_completed:
        raise HTTPException(status_code=400, detail="Quiz not completed")

    if session.case_selected:
        raise HTTPException(status_code=400, detail="Case already selected")

    case = await db.get(CaseIdentity, data.case_id)
    if not case or not case.is_active:
        raise HTTPException(status_code=404, detail="Case not found")

    # Atomically check and claim — use BEGIN IMMEDIATE via isolation level
    # Check if already taken (idempotency-safe for SQLite)
    taken_result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.assigned_case_id == data.case_id,
            ParticipantSession.case_selected == True,
            ParticipantSession.is_active_batch == True
        )
    )
    if taken_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This case identity is already taken by another investigator.")

    session.assigned_case_id = data.case_id
    session.case_selected = True
    session.stage = "clue"
    await db.commit()

    return {"selected": True, "case_number": case.case_number, "theme": case.theme}


# --- CLUE ---

@router.get("/clue")
async def get_clue(
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.case_selected or not session.assigned_case_id:
        raise HTTPException(status_code=400, detail="No case selected")

    case = await db.get(CaseIdentity, session.assigned_case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    session.clue_revealed = True
    session.stage = "investigation"
    await db.commit()

    return {
        "case_number": case.case_number,
        "theme": case.theme,
        "color_name": case.color_name,
        "color_hex": case.color_hex,
        "icon": case.icon,
        "clue": case.first_clue or "No clue configured for this case."
    }


# --- CODE VERIFICATION ---

@router.post("/verify-code", response_model=CodeVerifyResponse)
async def verify_code(
    data: CodeVerifyRequest,
    db: AsyncSession = Depends(get_db),
    x_session_token: str = Header(...)
):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.session_token == x_session_token
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.code_verified:
        raise HTTPException(status_code=400, detail="Already verified")

    case = await db.get(CaseIdentity, data.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    session.code_attempts += 1

    submitted_code = data.code.strip().upper().replace(" ", "")
    correct_code = (case.final_code or "").strip().upper().replace(" ", "")

    if submitted_code == correct_code and correct_code != "":
        session.code_verified = True
        session.verification_time = datetime.now(timezone.utc)
        session.stage = "completed"
        session.assigned_case_id = data.case_id
        await db.commit()
        return CodeVerifyResponse(verified=True, message="Evidence verified. Case cleared.")
    else:
        await db.commit()
        return CodeVerifyResponse(verified=False, message="Evidence does not match. Re-examine the case.")
