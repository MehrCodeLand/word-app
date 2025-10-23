from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import schemas
import services

router = APIRouter()

# User Endpoints
@router.post("/users/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = services.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return services.create_user(db=db, user=user)

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.get("/users/", response_model=List[schemas.UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = services.get_users(db, skip=skip, limit=limit)
    return users


# Language Endpoints
@router.post("/users/{user_id}/languages/", response_model=schemas.LanguageResponse, status_code=status.HTTP_201_CREATED)
def create_language(user_id: int, language: schemas.LanguageCreate, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.create_language(db=db, language=language, user_id=user_id)

@router.get("/users/{user_id}/languages/", response_model=List[schemas.LanguageResponse])
def read_languages(user_id: int, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.get_languages(db, user_id=user_id)

@router.put("/users/{user_id}/languages/{language_id}", response_model=schemas.LanguageResponse)
def update_language(user_id: int, language_id: int, language: schemas.LanguageUpdate, db: Session = Depends(get_db)):
    db_language = services.update_language(db, language_id=language_id, user_id=user_id, language_update=language)
    if db_language is None:
        raise HTTPException(status_code=404, detail="Language not found")
    return db_language

@router.delete("/users/{user_id}/languages/{language_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_language(user_id: int, language_id: int, db: Session = Depends(get_db)):
    success = services.delete_language(db, language_id=language_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Language not found")
    return None


# Word Endpoints
@router.post("/users/{user_id}/words/", response_model=schemas.WordResponse, status_code=status.HTTP_201_CREATED)
def create_word(user_id: int, word: schemas.WordCreate, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.create_word(db=db, word=word, user_id=user_id)

@router.get("/users/{user_id}/words/", response_model=List[schemas.WordResponse])
def read_words(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    language_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    words = services.get_words(db, user_id=user_id, skip=skip, limit=limit, language_id=language_id, search=search)
    return words

@router.get("/users/{user_id}/words/{word_id}")
def read_word(user_id: int, word_id: int, db: Session = Depends(get_db)):
    word_info = services.get_word_with_practice_info(db, word_id=word_id, user_id=user_id)
    if word_info is None:
        raise HTTPException(status_code=404, detail="Word not found")
    
    word = word_info["word"]
    
    # Manually construct response to avoid serialization issues
    return {
        "id": word.id,
        "word": word.word,
        "meaning": word.meaning,
        "language_id": word.language_id,
        "user_id": word.user_id,
        "created_at": word.created_at.isoformat(),
        "examples": [
            {
                "id": ex.id,
                "example_text": ex.example_text,
                "word_id": ex.word_id,
                "created_at": ex.created_at.isoformat()
            } for ex in word.examples
        ],
        "language": {
            "id": word.language.id,
            "name": word.language.name,
            "user_id": word.language.user_id,
            "created_at": word.language.created_at.isoformat()
        },
        "practice_days_completed": word_info["practice_days_completed"],
        "can_practice_today": word_info["can_practice_today"],
        "next_practice_day": word_info["next_practice_day"]
    }

@router.put("/users/{user_id}/words/{word_id}", response_model=schemas.WordResponse)
def update_word(user_id: int, word_id: int, word: schemas.WordUpdate, db: Session = Depends(get_db)):
    db_word = services.update_word(db, word_id=word_id, user_id=user_id, word_update=word)
    if db_word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    return db_word

@router.delete("/users/{user_id}/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(user_id: int, word_id: int, db: Session = Depends(get_db)):
    success = services.delete_word(db, word_id=word_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Word not found")
    return None


# Practice Endpoints
@router.post("/users/{user_id}/practice/", response_model=schemas.PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
def practice_word(user_id: int, practice: schemas.PracticeSessionCreate, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.practice_word(db, word_id=practice.word_id, user_id=user_id)

@router.get("/users/{user_id}/practice/", response_model=List[schemas.PracticeSessionResponse])
def read_practice_history(
    user_id: int,
    word_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.get_practice_history(db, user_id=user_id, word_id=word_id)

@router.get("/users/{user_id}/practice/today", response_model=List[schemas.WordResponse])
def get_words_to_practice_today(user_id: int, db: Session = Depends(get_db)):
    db_user = services.get_user(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return services.get_words_to_practice_today(db, user_id=user_id)
