from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    languages = relationship("Language", back_populates="user", cascade="all, delete-orphan")
    words = relationship("Word", back_populates="user")
    practice_sessions = relationship("PracticeSession", back_populates="user")


class Language(Base):
    __tablename__ = "languages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="languages")
    words = relationship("Word", back_populates="language", cascade="all, delete-orphan")


class Word(Base):
    __tablename__ = "words"
    
    id = Column(Integer, primary_key=True, index=True)
    word = Column(String(255), nullable=False, index=True)
    meaning = Column(Text, nullable=False)
    language_id = Column(Integer, ForeignKey("languages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="words")
    language = relationship("Language", back_populates="words", lazy="joined")
    examples = relationship("Example", back_populates="word", cascade="all, delete-orphan", lazy="joined")
    practice_sessions = relationship("PracticeSession", back_populates="word", cascade="all, delete-orphan")


class Example(Base):
    __tablename__ = "examples"
    
    id = Column(Integer, primary_key=True, index=True)
    example_text = Column(Text, nullable=False)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    word = relationship("Word", back_populates="examples")


class PracticeSession(Base):
    __tablename__ = "practice_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)
    practice_date = Column(Date, nullable=False, index=True)
    day_number = Column(Integer, nullable=False)  # 1-7 for the 7-day practice
    completed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="practice_sessions")
    word = relationship("Word", back_populates="practice_sessions")
