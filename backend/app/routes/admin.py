from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from typing import List

from ..database import get_db
from ..models import Question, CaseIdentity, ParticipantSession, EventSettings
from ..schemas import (
    LoginRequest, TokenResponse, QuestionCreate, QuestionUpdate,
    QuestionResponse, CaseIdentityCreate, CaseIdentityUpdate,
    CaseIdentityResponse, DashboardStats, ParticipantStatus,
    BulkQuestionImport
)
from ..auth import authenticate_admin, create_access_token, get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    if not authenticate_admin(request.username, request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": request.username})
    return TokenResponse(access_token=token)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    total_cases = await db.scalar(select(func.count(CaseIdentity.id)))
    total_questions = await db.scalar(select(func.count(Question.id)))

    in_progress = await db.scalar(
        select(func.count(ParticipantSession.id)).where(
            ParticipantSession.quiz_completed == False
        )
    )
    qualified = await db.scalar(
        select(func.count(ParticipantSession.id)).where(
            ParticipantSession.quiz_completed == True,
            ParticipantSession.code_verified == False
        )
    )
    verified = await db.scalar(
        select(func.count(ParticipantSession.id)).where(
            ParticipantSession.code_verified == True
        )
    )

    return DashboardStats(
        total_cases=total_cases or 0,
        in_progress=in_progress or 0,
        qualified=qualified or 0,
        verified=verified or 0,
        total_questions=total_questions or 0
    )


@router.get("/participants", response_model=List[ParticipantStatus])
async def get_participants(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.is_active_batch == True
        ).order_by(ParticipantSession.created_at.desc())
    )
    sessions = result.scalars().all()

    # Sort: verified first (by verification_time), then unverified by created_at
    verified = [s for s in sessions if s.code_verified]
    unverified = [s for s in sessions if not s.code_verified]
    verified.sort(key=lambda s: s.verification_time or s.created_at)
    sorted_sessions = verified + unverified

    participants = []
    for s in sorted_sessions:
        case_theme = None
        if s.assigned_case_id:
            case = await db.get(CaseIdentity, s.assigned_case_id)
            if case:
                case_theme = case.theme

        participants.append(ParticipantStatus(
            id=s.id,
            session_token=s.session_token[:8] + "...",
            team_name=s.team_name or "",
            assigned_case_id=s.assigned_case_id,
            case_theme=case_theme,
            correct_count=s.correct_count,
            wrong_count=s.wrong_count,
            quiz_completed=s.quiz_completed,
            case_selected=s.case_selected,
            clue_revealed=s.clue_revealed,
            code_verified=s.code_verified,
            code_attempts=s.code_attempts,
            stage=s.stage,
            verification_time=s.verification_time,
            created_at=s.created_at
        ))

    return participants


@router.get("/batch-history")
async def get_batch_history(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Get all archived batches with their names."""
    result = await db.execute(
        select(ParticipantSession).where(
            ParticipantSession.is_active_batch == False
        ).order_by(ParticipantSession.batch_number, ParticipantSession.verification_time)
    )
    sessions = result.scalars().all()

    batches: dict = {}
    for s in sessions:
        bn = s.batch_number or 1
        if bn not in batches:
            batches[bn] = {"name": s.batch_name or f"Batch {bn}", "participants": []}

        case_theme = None
        if s.assigned_case_id:
            case = await db.get(CaseIdentity, s.assigned_case_id)
            if case:
                case_theme = case.theme

        batches[bn]["participants"].append({
            "team_name": s.team_name,
            "case_theme": case_theme,
            "correct_count": s.correct_count,
            "wrong_count": s.wrong_count,
            "quiz_completed": s.quiz_completed,
            "code_verified": s.code_verified,
            "code_attempts": s.code_attempts,
            "stage": s.stage,
            "verification_time": s.verification_time.isoformat() if s.verification_time else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    return batches


@router.delete("/batch-history/{batch_number}")
async def delete_batch_history(batch_number: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Delete all archived participants from a specific batch."""
    await db.execute(
        delete(ParticipantSession).where(
            ParticipantSession.batch_number == batch_number,
            ParticipantSession.is_active_batch == False
        )
    )
    await db.commit()
    return {"deleted": True}


# Question CRUD
@router.get("/questions", response_model=List[QuestionResponse])
async def get_questions(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Question).order_by(Question.order_index))
    return result.scalars().all()


@router.post("/questions", response_model=QuestionResponse)
async def create_question(data: QuestionCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    q = Question(**data.model_dump())
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


@router.post("/questions/bulk", response_model=dict)
async def bulk_import_questions(data: BulkQuestionImport, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    count = 0
    for q_data in data.questions:
        q = Question(**q_data.model_dump())
        db.add(q)
        count += 1
    await db.commit()
    return {"imported": count}


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(question_id: int, data: QuestionUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(q, key, value)
    await db.commit()
    await db.refresh(q)
    return q


@router.delete("/questions/{question_id}")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    q = await db.get(Question, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(q)
    await db.commit()
    return {"deleted": True}


# Case Identity CRUD
@router.get("/cases", response_model=List[CaseIdentityResponse])
async def get_cases(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(CaseIdentity).order_by(CaseIdentity.case_number))
    return result.scalars().all()


@router.post("/cases", response_model=CaseIdentityResponse)
async def create_case(data: CaseIdentityCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    case = CaseIdentity(**data.model_dump())
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.put("/cases/{case_id}", response_model=CaseIdentityResponse)
async def update_case(case_id: int, data: CaseIdentityUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    case = await db.get(CaseIdentity, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(case, key, value)
    await db.commit()
    await db.refresh(case)
    return case


@router.delete("/cases/{case_id}")
async def delete_case(case_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    case = await db.get(CaseIdentity, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    await db.delete(case)
    await db.commit()
    return {"deleted": True}


# Reset controls
@router.post("/reset/participant/{session_id}")
async def reset_participant(session_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    session = await db.get(ParticipantSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"reset": True}


@router.post("/reset/all-quizzes")
async def reset_all_quizzes(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await db.execute(
        update(ParticipantSession).values(
            quiz_questions=None,
            quiz_answers=[],
            correct_count=0,
            wrong_count=0,
            current_question_index=0,
            quiz_completed=False,
            case_selected=False,
            clue_revealed=False,
            stage="landing"
        )
    )
    await db.commit()
    return {"reset": True}


@router.post("/reset/all-codes")
async def reset_all_codes(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await db.execute(
        update(ParticipantSession).values(
            code_verified=False,
            code_attempts=0,
            verification_time=None
        ).where(ParticipantSession.quiz_completed == True)
    )
    await db.commit()
    return {"reset": True}


@router.post("/reset/event")
async def reset_entire_event(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await db.execute(delete(ParticipantSession))
    await db.commit()
    return {"reset": True}


# Game Control
@router.get("/game-settings")
async def get_game_settings(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    game_code_row = await db.execute(select(EventSettings).where(EventSettings.key == "game_code"))
    game_started_row = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
    lobby_open_row = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    batch_row = await db.execute(select(EventSettings).where(EventSettings.key == "batch_number"))
    batch_name_row = await db.execute(select(EventSettings).where(EventSettings.key == "batch_name"))
    game_code = game_code_row.scalar_one_or_none()
    game_started = game_started_row.scalar_one_or_none()
    lobby_open = lobby_open_row.scalar_one_or_none()
    batch = batch_row.scalar_one_or_none()
    batch_name = batch_name_row.scalar_one_or_none()
    return {
        "game_code": game_code.value if game_code else "",
        "game_started": (game_started.value == "true") if game_started else False,
        "lobby_open": (lobby_open.value == "true") if lobby_open else False,
        "batch_number": int(batch.value) if batch else 1,
        "batch_name": batch_name.value if batch_name else "Batch 1",
    }


@router.post("/game-settings")
async def update_game_settings(data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    if "game_code" in data:
        result = await db.execute(select(EventSettings).where(EventSettings.key == "game_code"))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = data["game_code"].strip().upper()
        else:
            db.add(EventSettings(key="game_code", value=data["game_code"].strip().upper()))

    if "game_started" in data:
        result = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
        setting = result.scalar_one_or_none()
        val = "true" if data["game_started"] else "false"
        if setting:
            setting.value = val
        else:
            db.add(EventSettings(key="game_started", value=val))

    if "batch_name" in data:
        result = await db.execute(select(EventSettings).where(EventSettings.key == "batch_name"))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = data["batch_name"]
        else:
            db.add(EventSettings(key="batch_name", value=data["batch_name"]))

    await db.commit()
    return {"updated": True}


@router.post("/start-game")
async def start_game(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = "true"
    else:
        db.add(EventSettings(key="game_started", value="true"))
    # Close lobby when game starts
    lobby_result = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    lobby_setting = lobby_result.scalar_one_or_none()
    if lobby_setting:
        lobby_setting.value = "false"
    await db.commit()
    return {"game_started": True}


@router.post("/stop-game")
async def stop_game(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """End the current session — stops game and closes lobby."""
    result = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = "false"
    else:
        db.add(EventSettings(key="game_started", value="false"))

    # Also close lobby
    lobby_result = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    lobby_setting = lobby_result.scalar_one_or_none()
    if lobby_setting:
        lobby_setting.value = "false"

    await db.commit()
    return {"game_started": False}


@router.post("/open-lobby")
async def open_lobby(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Open lobby and generate a fresh code for a new batch."""
    import random as _random
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    new_code = ''.join(_random.choices(chars, k=6))

    # Set lobby open
    result = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = "true"
    else:
        db.add(EventSettings(key="lobby_open", value="true"))

    # Set new code
    code_result = await db.execute(select(EventSettings).where(EventSettings.key == "game_code"))
    code_setting = code_result.scalar_one_or_none()
    if code_setting:
        code_setting.value = new_code
    else:
        db.add(EventSettings(key="game_code", value=new_code))

    # Make sure game is stopped
    game_result = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
    game_setting = game_result.scalar_one_or_none()
    if game_setting:
        game_setting.value = "false"

    await db.commit()
    return {"lobby_open": True, "game_code": new_code}


@router.post("/close-lobby")
async def close_lobby(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = "false"
    else:
        db.add(EventSettings(key="lobby_open", value="false"))
    await db.commit()
    return {"lobby_open": False}


@router.post("/new-batch")
async def new_batch(data: dict = {}, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Archive current batch participants and prepare for a new batch. Keeps questions and cases."""
    # Get current batch name
    batch_name_result = await db.execute(select(EventSettings).where(EventSettings.key == "batch_name"))
    batch_name_setting = batch_name_result.scalar_one_or_none()
    current_batch_name = batch_name_setting.value if batch_name_setting else "Batch"

    # Archive all active participants (mark as inactive, store batch name)
    result = await db.execute(
        select(ParticipantSession).where(ParticipantSession.is_active_batch == True)
    )
    active_sessions = result.scalars().all()
    for s in active_sessions:
        s.is_active_batch = False
        s.batch_name = current_batch_name

    # Stop game
    game_result = await db.execute(select(EventSettings).where(EventSettings.key == "game_started"))
    game_setting = game_result.scalar_one_or_none()
    if game_setting:
        game_setting.value = "false"

    # Close lobby
    lobby_result = await db.execute(select(EventSettings).where(EventSettings.key == "lobby_open"))
    lobby_setting = lobby_result.scalar_one_or_none()
    if lobby_setting:
        lobby_setting.value = "false"

    # Increment batch number
    batch_result = await db.execute(select(EventSettings).where(EventSettings.key == "batch_number"))
    batch_setting = batch_result.scalar_one_or_none()
    new_num = int(batch_setting.value or "1") + 1 if batch_setting else 2
    if batch_setting:
        batch_setting.value = str(new_num)
    else:
        db.add(EventSettings(key="batch_number", value=str(new_num)))

    # Reset batch name
    if batch_name_setting:
        batch_name_setting.value = f"Batch {new_num}"
    else:
        db.add(EventSettings(key="batch_name", value=f"Batch {new_num}"))

    await db.commit()
    return {"new_batch": True}
