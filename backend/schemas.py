from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import List, Optional

# Language Schemas
class LanguageBase(BaseModel):
    name: str

class LanguageCreate(LanguageBase):
    pass

class LanguageUpdate(LanguageBase):
    pass

class LanguageResponse(LanguageBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Example Schemas
class ExampleBase(BaseModel):
    example_text: str

class ExampleCreate(ExampleBase):
    pass

class ExampleResponse(ExampleBase):
    id: int
    word_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Word Schemas
class WordBase(BaseModel):
    word: str
    meaning: str
    language_id: int

class WordCreate(WordBase):
    examples: List[str] = []

class WordUpdate(WordBase):
    examples: List[str] = []

class WordResponse(BaseModel):
    id: int
    word: str
    meaning: str
    language_id: int
    user_id: int
    created_at: datetime
    examples: List[ExampleResponse] = []
    language: LanguageResponse
    
    class Config:
        from_attributes = True


class WordWithPracticeResponse(WordResponse):
    practice_days_completed: int
    can_practice_today: bool
    next_practice_day: Optional[int]


# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Practice Session Schemas
class PracticeSessionCreate(BaseModel):
    word_id: int

class PracticeSessionResponse(BaseModel):
    id: int
    user_id: int
    word_id: int
    practice_date: date
    day_number: int
    completed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class PracticeWordResponse(BaseModel):
    word: WordResponse
    practice_session: PracticeSessionResponse
    
    class Config:
        from_attributes = True
