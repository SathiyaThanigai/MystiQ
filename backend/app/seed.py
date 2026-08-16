"""Seed the database with initial case identities (no sample questions - admin adds their own)."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import CaseIdentity, Question, EventSettings


CASE_IDENTITIES = [
    {"case_number": 1, "theme": "BLOOD EVIDENCE", "color_name": "Crimson Red", "color_hex": "#dc2626", "icon": "blood-drop", "first_clue": "", "final_code": ""},
    {"case_number": 2, "theme": "DETECTIVE FILES", "color_name": "Royal Blue", "color_hex": "#1d4ed8", "icon": "magnifying-glass", "first_clue": "", "final_code": ""},
    {"case_number": 3, "theme": "CRIME SCENE", "color_name": "Caution Yellow", "color_hex": "#ca8a04", "icon": "crime-tape", "first_clue": "", "final_code": ""},
    {"case_number": 4, "theme": "BLACKMAIL CASE", "color_name": "Black", "color_hex": "#374151", "icon": "sealed-envelope", "first_clue": "", "final_code": ""},
    {"case_number": 5, "theme": "FORENSIC LAB", "color_name": "Hot Pink", "color_hex": "#db2777", "icon": "test-tube", "first_clue": "", "final_code": ""},
    {"case_number": 6, "theme": "MOTIVE & PSYCHOLOGY", "color_name": "Deep Purple", "color_hex": "#7c3aed", "icon": "brain", "first_clue": "", "final_code": ""},
    {"case_number": 7, "theme": "COLD CASE", "color_name": "Dark Brown", "color_hex": "#92400e", "icon": "archive-folder", "first_clue": "", "final_code": ""},
    {"case_number": 8, "theme": "EVIDENCE RECOVERY", "color_name": "Burnt Orange", "color_hex": "#ea580c", "icon": "evidence-bag", "first_clue": "", "final_code": ""},
    {"case_number": 9, "theme": "SURVEILLANCE UNIT", "color_name": "Steel Gray", "color_hex": "#4b5563", "icon": "cctv-camera", "first_clue": "", "final_code": ""},
    {"case_number": 10, "theme": "SECRET INVESTIGATION", "color_name": "Dark Green", "color_hex": "#15803d", "icon": "hidden-key", "first_clue": "", "final_code": ""},
]

import random
import string

def generate_session_code():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=6))

DEFAULT_SETTINGS = [
    {"key": "game_code", "value": generate_session_code()},
    {"key": "game_started", "value": "false"},
    {"key": "lobby_open", "value": "false"},
    {"key": "batch_number", "value": "1"},
    {"key": "batch_name", "value": "Batch 1"},
]


async def seed_database(db: AsyncSession):
    """Seed the database with case identities and default settings."""
    # Seed case identities
    for case_data in CASE_IDENTITIES:
        existing = await db.execute(
            select(CaseIdentity).where(CaseIdentity.case_number == case_data["case_number"])
        )
        if not existing.scalar_one_or_none():
            db.add(CaseIdentity(**case_data))

    # Seed event settings
    for setting in DEFAULT_SETTINGS:
        existing = await db.execute(
            select(EventSettings).where(EventSettings.key == setting["key"])
        )
        if not existing.scalar_one_or_none():
            db.add(EventSettings(**setting))

    await db.commit()
