from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_
from models import User, Word, Example, PracticeSession, Language
from schemas import UserCreate, WordCreate, WordUpdate, LanguageCreate, LanguageUpdate
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException

# User Services
def create_user(db: Session, user: UserCreate):
    db_user = User(username=user.username, email=user.email)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


# Language Services
def create_language(db: Session, language: LanguageCreate, user_id: int):
    # Check if language already exists for this user
    existing = db.query(Language).filter(
        and_(
            Language.user_id == user_id,
            Language.name == language.name
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")
    
    db_language = Language(name=language.name, user_id=user_id)
    db.add(db_language)
    db.commit()
    db.refresh(db_language)
    return db_language

def get_language(db: Session, language_id: int):
    return db.query(Language).filter(Language.id == language_id).first()

def get_languages(db: Session, user_id: int):
    return db.query(Language).filter(Language.user_id == user_id).all()

def update_language(db: Session, language_id: int, user_id: int, language_update: LanguageUpdate):
    db_language = get_language(db, language_id)
    if not db_language or db_language.user_id != user_id:
        return None
    
    db_language.name = language_update.name
    db.commit()
    db.refresh(db_language)
    return db_language

def delete_language(db: Session, language_id: int, user_id: int):
    db_language = get_language(db, language_id)
    if not db_language or db_language.user_id != user_id:
        return False
    
    # This will cascade delete all words in this language
    db.delete(db_language)
    db.commit()
    return True


# Word Services
def create_word(db: Session, word: WordCreate, user_id: int):
    # Verify language belongs to user
    language = get_language(db, word.language_id)
    if not language or language.user_id != user_id:
        raise HTTPException(status_code=404, detail="Language not found")
    
    db_word = Word(
        word=word.word,
        meaning=word.meaning,
        language_id=word.language_id,
        user_id=user_id
    )
    db.add(db_word)
    db.commit()
    db.refresh(db_word)
    
    # Add examples
    for example_text in word.examples:
        db_example = Example(example_text=example_text, word_id=db_word.id)
        db.add(db_example)
    
    db.commit()
    db.refresh(db_word)
    return db_word

def get_word(db: Session, word_id: int):
    return db.query(Word).filter(Word.id == word_id).first()

def get_words(db: Session, user_id: int, skip: int = 0, limit: int = 100, 
              language_id: Optional[int] = None, search: Optional[str] = None):
    query = db.query(Word).filter(Word.user_id == user_id)
    
    if language_id:
        query = query.filter(Word.language_id == language_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Word.word.ilike(search_term),
                Word.meaning.ilike(search_term)
            )
        )
    
    return query.offset(skip).limit(limit).all()

def get_word_with_practice_info(db: Session, word_id: int, user_id: int):
    word = get_word(db, word_id)
    if not word or word.user_id != user_id:
        return None
    
    # Count practice days completed
    practice_count = db.query(PracticeSession).filter(
        PracticeSession.word_id == word_id,
        PracticeSession.user_id == user_id
    ).count()
    
    # Check if can practice today
    today = date.today()
    today_practice = db.query(PracticeSession).filter(
        and_(
            PracticeSession.word_id == word_id,
            PracticeSession.user_id == user_id,
            PracticeSession.practice_date == today
        )
    ).first()
    
    can_practice = today_practice is None and practice_count < 7
    next_day = practice_count + 1 if practice_count < 7 else None
    
    return {
        "word": word,
        "practice_days_completed": practice_count,
        "can_practice_today": can_practice,
        "next_practice_day": next_day
    }

def update_word(db: Session, word_id: int, user_id: int, word_update: WordUpdate):
    db_word = get_word(db, word_id)
    if not db_word or db_word.user_id != user_id:
        return None
    
    # Verify language belongs to user
    language = get_language(db, word_update.language_id)
    if not language or language.user_id != user_id:
        raise HTTPException(status_code=404, detail="Language not found")
    
    db_word.word = word_update.word
    db_word.meaning = word_update.meaning
    db_word.language_id = word_update.language_id
    
    # Delete old examples and add new ones
    db.query(Example).filter(Example.word_id == word_id).delete()
    for example_text in word_update.examples:
        db_example = Example(example_text=example_text, word_id=word_id)
        db.add(db_example)
    
    db.commit()
    db.refresh(db_word)
    return db_word

def delete_word(db: Session, word_id: int, user_id: int):
    db_word = get_word(db, word_id)
    if not db_word or db_word.user_id != user_id:
        return False
    
    db.delete(db_word)
    db.commit()
    return True


# Practice Services
def practice_word(db: Session, word_id: int, user_id: int):
    # Check if word exists and belongs to user
    word = get_word(db, word_id)
    if not word or word.user_id != user_id:
        raise HTTPException(status_code=404, detail="Word not found")
    
    # Check if already practiced today
    today = date.today()
    existing_practice = db.query(PracticeSession).filter(
        and_(
            PracticeSession.word_id == word_id,
            PracticeSession.user_id == user_id,
            PracticeSession.practice_date == today
        )
    ).first()
    
    if existing_practice:
        raise HTTPException(status_code=400, detail="Word already practiced today")
    
    # Check if already completed 7 days
    practice_count = db.query(PracticeSession).filter(
        PracticeSession.word_id == word_id,
        PracticeSession.user_id == user_id
    ).count()
    
    if practice_count >= 7:
        raise HTTPException(status_code=400, detail="Word practice already completed (7 days)")
    
    # Create new practice session
    practice_session = PracticeSession(
        user_id=user_id,
        word_id=word_id,
        practice_date=today,
        day_number=practice_count + 1
    )
    db.add(practice_session)
    db.commit()
    db.refresh(practice_session)
    
    return practice_session

def get_practice_history(db: Session, user_id: int, word_id: Optional[int] = None):
    query = db.query(PracticeSession).filter(PracticeSession.user_id == user_id)
    if word_id:
        query = query.filter(PracticeSession.word_id == word_id)
    return query.order_by(PracticeSession.practice_date.desc()).all()

def get_words_to_practice_today(db: Session, user_id: int):
    """Get words that can be practiced today (not practiced today and less than 7 days)"""
    today = date.today()
    
    # Get all user's words
    all_words = db.query(Word).filter(Word.user_id == user_id).all()
    
    words_to_practice = []
    for word in all_words:
        # Count total practice sessions
        practice_count = db.query(PracticeSession).filter(
            PracticeSession.word_id == word.id,
            PracticeSession.user_id == user_id
        ).count()
        
        if practice_count >= 7:
            continue
        
        # Check if practiced today
        today_practice = db.query(PracticeSession).filter(
            and_(
                PracticeSession.word_id == word.id,
                PracticeSession.user_id == user_id,
                PracticeSession.practice_date == today
            )
        ).first()
        
        if not today_practice:
            words_to_practice.append(word)
    
    return words_to_practice
