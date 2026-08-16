import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import Optional, List

from ..database import get_db
from ..models import Level2CaseFile, Level2Suspect, Level2Session, Level2Settings
from ..auth import get_current_admin

router = APIRouter(prefix="/api/level2", tags=["level2"])


async def get_l2_setting(db: AsyncSession, key: str) -> Optional[str]:
    result = await db.execute(select(Level2Settings).where(Level2Settings.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def set_l2_setting(db: AsyncSession, key: str, value: str):
    result = await db.execute(select(Level2Settings).where(Level2Settings.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
    else:
        db.add(Level2Settings(key=key, value=value))


# ===== ADMIN ROUTES =====

@router.get("/admin/settings")
async def get_settings(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    lobby_open = await get_l2_setting(db, "lobby_open")
    game_started = await get_l2_setting(db, "game_started")
    game_code = await get_l2_setting(db, "game_code")
    answer_revealed = await get_l2_setting(db, "answer_revealed")
    final_attempt_open = await get_l2_setting(db, "final_attempt_open")
    case_answer_text = await get_l2_setting(db, "case_answer_text")
    return {
        "lobby_open": lobby_open == "true",
        "game_started": game_started == "true",
        "game_code": game_code or "",
        "answer_revealed": answer_revealed == "true",
        "final_attempt_open": final_attempt_open == "true",
        "case_answer_text": case_answer_text or "",
    }


@router.post("/admin/open-lobby")
async def open_lobby(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    import random
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    code = ''.join(random.choices(chars, k=6))
    await set_l2_setting(db, "lobby_open", "true")
    await set_l2_setting(db, "game_started", "false")
    await set_l2_setting(db, "game_code", code)
    await set_l2_setting(db, "answer_revealed", "false")
    await db.commit()
    return {"lobby_open": True, "game_code": code}


@router.post("/admin/close-lobby")
async def close_lobby(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await set_l2_setting(db, "lobby_open", "false")
    await db.commit()
    return {"lobby_open": False}


@router.post("/admin/start-game")
async def start_game(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Start Level 2 — begins the 15 min reading timer for all participants."""
    now = datetime.now(timezone.utc).isoformat()
    await set_l2_setting(db, "game_started", "true")
    await set_l2_setting(db, "lobby_open", "false")
    await set_l2_setting(db, "game_start_time", now)
    await set_l2_setting(db, "answer_revealed", "false")

    # Set all participants to reading stage
    result = await db.execute(
        select(Level2Session).where(Level2Session.stage.in_(["lobby", "select_case"]))
    )
    sessions = result.scalars().all()
    for s in sessions:
        s.stage = "reading"
        s.reading_start_time = datetime.now(timezone.utc)

    await db.commit()
    return {"game_started": True, "start_time": now}


@router.post("/admin/stop-game")
async def stop_game(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await set_l2_setting(db, "game_started", "false")
    await db.commit()
    return {"game_started": False}


@router.post("/admin/reveal-answer")
async def reveal_answer(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await set_l2_setting(db, "answer_revealed", "true")
    await db.commit()
    return {"answer_revealed": True}


@router.post("/admin/give-final-attempt")
async def give_final_attempt(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    """Give all unsolved participants one more untimed attempt."""
    await set_l2_setting(db, "final_attempt_open", "true")
    # Move lost participants and those in attempt2 to final_attempt stage
    result = await db.execute(
        select(Level2Session).where(Level2Session.stage.in_(["lost", "attempt2", "attempt1", "reading"]))
    )
    sessions = result.scalars().all()
    for s in sessions:
        s.stage = "final_attempt"
    await db.commit()
    return {"final_attempt_open": True, "moved": len(sessions)}


@router.post("/admin/set-answer-text")
async def set_answer_text(data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await set_l2_setting(db, "case_answer_text", data.get("text", ""))
    await db.commit()
    return {"updated": True}


@router.post("/admin/reset")
async def reset_level2(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    await db.execute(delete(Level2Session))
    await set_l2_setting(db, "game_started", "false")
    await set_l2_setting(db, "lobby_open", "false")
    await set_l2_setting(db, "answer_revealed", "false")
    await set_l2_setting(db, "final_attempt_open", "false")
    await set_l2_setting(db, "game_start_time", "")
    await db.commit()
    return {"reset": True}


# Case Files CRUD
@router.get("/admin/case-files")
async def get_case_files(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Level2CaseFile).order_by(Level2CaseFile.id))
    return result.scalars().all()


@router.post("/admin/case-files")
async def create_case_file(data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    cf = Level2CaseFile(name=data["name"], description=data.get("description", ""), color_hex=data.get("color_hex", "#dc2626"), answer_text=data.get("answer_text", ""))
    db.add(cf)
    await db.commit()
    await db.refresh(cf)
    return cf


@router.put("/admin/case-files/{cf_id}")
async def update_case_file(cf_id: int, data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    cf = await db.get(Level2CaseFile, cf_id)
    if not cf:
        raise HTTPException(status_code=404, detail="Case file not found")
    for k, v in data.items():
        if hasattr(cf, k):
            setattr(cf, k, v)
    await db.commit()
    await db.refresh(cf)
    return cf


@router.delete("/admin/case-files/{cf_id}")
async def delete_case_file(cf_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    cf = await db.get(Level2CaseFile, cf_id)
    if not cf:
        raise HTTPException(status_code=404, detail="Case file not found")
    await db.delete(cf)
    await db.commit()
    return {"deleted": True}


# Suspects CRUD
@router.get("/admin/suspects")
async def get_suspects(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Level2Suspect).order_by(Level2Suspect.case_file_id, Level2Suspect.order_index))
    return result.scalars().all()


@router.get("/admin/suspects/by-case/{case_file_id}")
async def get_suspects_by_case(case_file_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Level2Suspect).where(Level2Suspect.case_file_id == case_file_id).order_by(Level2Suspect.order_index))
    return result.scalars().all()


@router.post("/admin/suspects")
async def create_suspect(data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    s = Level2Suspect(
        case_file_id=data["case_file_id"],
        name=data["name"],
        description=data.get("description", ""),
        motive=data.get("motive", ""),
        image_url=data.get("image_url", ""),
        is_correct=data.get("is_correct", False),
        order_index=data.get("order_index", 0),
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return s


@router.put("/admin/suspects/{suspect_id}")
async def update_suspect(suspect_id: int, data: dict, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    s = await db.get(Level2Suspect, suspect_id)
    if not s:
        raise HTTPException(status_code=404, detail="Suspect not found")
    for k, v in data.items():
        if hasattr(s, k):
            setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return s


@router.delete("/admin/suspects/{suspect_id}")
async def delete_suspect(suspect_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    s = await db.get(Level2Suspect, suspect_id)
    if not s:
        raise HTTPException(status_code=404, detail="Suspect not found")
    await db.delete(s)
    await db.commit()
    return {"deleted": True}


# Participants/Rankings
@router.get("/admin/participants")
async def get_l2_participants(db: AsyncSession = Depends(get_db), _=Depends(get_current_admin)):
    result = await db.execute(select(Level2Session).order_by(Level2Session.solved_time.asc().nullslast(), Level2Session.created_at))
    sessions = result.scalars().all()
    participants = []
    for s in sessions:
        cf_name = None
        if s.selected_case_file_id:
            cf = await db.get(Level2CaseFile, s.selected_case_file_id)
            if cf:
                cf_name = cf.name
        participants.append({
            "id": s.id,
            "team_name": s.team_name,
            "case_file": cf_name,
            "case_file_id": s.selected_case_file_id,
            "stage": s.stage,
            "attempt1_correct": s.attempt1_correct,
            "attempt2_correct": s.attempt2_correct,
            "solved_time": s.solved_time.isoformat() if s.solved_time else None,
            "rank": s.rank,
        })
    return participants


# ===== PARTICIPANT ROUTES =====

@router.post("/join")
async def join_level2(data: dict, db: AsyncSession = Depends(get_db)):
    game_code = data.get("game_code", "").strip().upper()
    team_name = data.get("team_name", "").strip()

    if not game_code or not team_name:
        raise HTTPException(status_code=400, detail="Game code and team name are required.")

    lobby_open = await get_l2_setting(db, "lobby_open")
    if lobby_open != "true":
        raise HTTPException(status_code=403, detail="Lobby is not open yet.")

    correct_code = await get_l2_setting(db, "game_code")
    if not correct_code or game_code != correct_code.strip().upper():
        raise HTTPException(status_code=401, detail="Invalid session code.")

    # Check duplicate team name
    existing = await db.execute(select(Level2Session).where(Level2Session.team_name == team_name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This team name is already taken.")

    token = secrets.token_urlsafe(32)
    session = Level2Session(session_token=token, team_name=team_name, stage="select_case")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"session_token": token, "team_name": team_name, "stage": "select_case"}


@router.get("/status")
async def get_game_status(db: AsyncSession = Depends(get_db)):
    game_started = await get_l2_setting(db, "game_started")
    lobby_open = await get_l2_setting(db, "lobby_open")
    game_start_time = await get_l2_setting(db, "game_start_time")
    answer_revealed = await get_l2_setting(db, "answer_revealed")
    final_attempt_open = await get_l2_setting(db, "final_attempt_open")
    result = await db.scalar(select(func.count(Level2Session.id)))
    total = result or 0
    return {
        "game_started": game_started == "true",
        "lobby_open": lobby_open == "true",
        "game_start_time": game_start_time,
        "answer_revealed": answer_revealed == "true",
        "final_attempt_open": final_attempt_open == "true",
        "participants_waiting": total,
    }


@router.post("/session")
async def get_session(db: AsyncSession = Depends(get_db), x_session_token: Optional[str] = Header(None)):
    if not x_session_token:
        raise HTTPException(status_code=401, detail="No session token")
    result = await db.execute(select(Level2Session).where(Level2Session.session_token == x_session_token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_token": session.session_token,
        "team_name": session.team_name,
        "stage": session.stage,
        "selected_case_file_id": session.selected_case_file_id,
        "reading_start_time": session.reading_start_time.isoformat() if session.reading_start_time else None,
        "attempt1_start_time": session.attempt1_start_time.isoformat() if session.attempt1_start_time else None,
        "attempt1_correct": session.attempt1_correct,
        "attempt2_start_time": session.attempt2_start_time.isoformat() if session.attempt2_start_time else None,
        "attempt2_correct": session.attempt2_correct,
        "solved_time": session.solved_time.isoformat() if session.solved_time else None,
        "rank": session.rank,
    }


@router.get("/case-files")
async def get_public_case_files(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Level2CaseFile).where(Level2CaseFile.is_active == True))
    cases = result.scalars().all()

    # Check which are taken
    taken_result = await db.execute(
        select(Level2Session.selected_case_file_id).where(Level2Session.selected_case_file_id != None)
    )
    taken_ids = set(row[0] for row in taken_result.all())

    return [{"id": c.id, "name": c.name, "description": c.description, "color_hex": c.color_hex, "taken": c.id in taken_ids} for c in cases]


@router.post("/select-case-file")
async def select_case_file(data: dict, db: AsyncSession = Depends(get_db), x_session_token: str = Header(...)):
    result = await db.execute(select(Level2Session).where(Level2Session.session_token == x_session_token))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.selected_case_file_id:
        raise HTTPException(status_code=400, detail="Case file already selected")

    cf_id = data.get("case_file_id")
    cf = await db.get(Level2CaseFile, cf_id)
    if not cf:
        raise HTTPException(status_code=404, detail="Case file not found")

    # Check if taken (SQLite-safe — no FOR UPDATE needed)
    taken = await db.execute(
        select(Level2Session).where(Level2Session.selected_case_file_id == cf_id)
    )
    if taken.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This case file is already taken.")

    session.selected_case_file_id = cf_id
    session.stage = "lobby"
    await db.commit()
    return {"selected": True}


@router.get("/suspects")
async def get_public_suspects(db: AsyncSession = Depends(get_db), x_session_token: Optional[str] = Header(None)):
    """Get suspects for the participant's selected case file (without revealing who is correct)."""
    if not x_session_token:
        raise HTTPException(status_code=401, detail="No session")
    sess_result = await db.execute(select(Level2Session).where(Level2Session.session_token == x_session_token))
    session = sess_result.scalar_one_or_none()
    if not session or not session.selected_case_file_id:
        raise HTTPException(status_code=400, detail="No case file selected")

    result = await db.execute(select(Level2Suspect).where(Level2Suspect.case_file_id == session.selected_case_file_id).order_by(Level2Suspect.order_index))
    suspects = result.scalars().all()
    return [{"id": s.id, "name": s.name, "description": s.description, "motive": s.motive, "image_url": s.image_url} for s in suspects]


@router.post("/submit-answer")
async def submit_answer(data: dict, db: AsyncSession = Depends(get_db), x_session_token: str = Header(...)):
    result = await db.execute(
        select(Level2Session).where(Level2Session.session_token == x_session_token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Prevent submitting if already won or lost (idempotency)
    if session.stage in ("won", "lost"):
        return {"correct": session.stage == "won", "stage": session.stage, "rank": session.rank}

    suspect_id = data.get("suspect_id")
    suspect = await db.get(Level2Suspect, suspect_id)
    if not suspect:
        raise HTTPException(status_code=404, detail="Suspect not found")

    now = datetime.now(timezone.utc)

    if session.stage == "attempt1" or session.stage == "reading":
        session.attempt1_suspect_id = suspect_id
        session.attempt1_correct = suspect.is_correct
        session.attempt1_start_time = session.attempt1_start_time or now

        if suspect.is_correct:
            session.stage = "won"
            session.solved_time = now
            rank_result = await db.execute(
                select(func.count(Level2Session.id)).where(
                    Level2Session.stage == "won",
                    Level2Session.id != session.id
                )
            )
            session.rank = (rank_result.scalar() or 0) + 1
        else:
            session.stage = "attempt2"
            session.attempt2_start_time = now

        await db.commit()
        return {"correct": suspect.is_correct, "stage": session.stage, "rank": session.rank}

    elif session.stage == "attempt2":
        session.attempt2_suspect_id = suspect_id
        session.attempt2_correct = suspect.is_correct

        if suspect.is_correct:
            session.stage = "won"
            session.solved_time = now
            rank_result = await db.execute(
                select(func.count(Level2Session.id)).where(
                    Level2Session.stage == "won",
                    Level2Session.id != session.id
                )
            )
            session.rank = (rank_result.scalar() or 0) + 1
        else:
            session.stage = "lost"

        await db.commit()
        return {"correct": suspect.is_correct, "stage": session.stage, "rank": session.rank}

    elif session.stage == "final_attempt":
        if suspect.is_correct:
            session.stage = "won"
            session.solved_time = now
            rank_result = await db.execute(
                select(func.count(Level2Session.id)).where(
                    Level2Session.stage == "won",
                    Level2Session.id != session.id
                )
            )
            session.rank = (rank_result.scalar() or 0) + 1
        else:
            session.stage = "lost"

        await db.commit()
        return {"correct": suspect.is_correct, "stage": session.stage, "rank": session.rank}

    else:
        raise HTTPException(status_code=400, detail="No attempts remaining")


@router.get("/answer")
async def get_answer(db: AsyncSession = Depends(get_db), x_session_token: Optional[str] = Header(None)):
    """Get the correct answer — only if admin has revealed it."""
    revealed = await get_l2_setting(db, "answer_revealed")
    if revealed != "true":
        raise HTTPException(status_code=403, detail="Answer not revealed yet")

    # Get participant's case file
    case_file_id = None
    if x_session_token:
        sess_result = await db.execute(select(Level2Session).where(Level2Session.session_token == x_session_token))
        session = sess_result.scalar_one_or_none()
        if session:
            case_file_id = session.selected_case_file_id

    # Get correct suspect for their case file
    correct_suspect = None
    answer_text = ""
    if case_file_id:
        result = await db.execute(select(Level2Suspect).where(Level2Suspect.case_file_id == case_file_id, Level2Suspect.is_correct == True))
        correct_suspect = result.scalar_one_or_none()
        cf = await db.get(Level2CaseFile, case_file_id)
        if cf:
            answer_text = cf.answer_text or ""

    return {
        "suspect": {"name": correct_suspect.name, "description": correct_suspect.description, "motive": correct_suspect.motive} if correct_suspect else None,
        "explanation": answer_text,
    }


@router.get("/rankings")
async def get_rankings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Level2Session).where(Level2Session.stage == "won").order_by(Level2Session.solved_time.asc())
    )
    winners = result.scalars().all()
    return [{"rank": i + 1, "team_name": w.team_name, "solved_time": w.solved_time.isoformat() if w.solved_time else None} for i, w in enumerate(winners)]
