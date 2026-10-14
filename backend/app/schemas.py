from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import CourseStatus, Role


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- auth / users ---

class LoginIn(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: int
    email: str
    full_name: str
    role: Role
    department: str
    language: str
    is_active: bool
    telegram_linked: bool = False


class UserCreate(BaseModel):
    email: str
    full_name: str = ""
    password: str = Field(min_length=6)
    role: Role = Role.employee
    department: str = ""
    language: str = Field("uz", pattern="^(uz|ru)$")


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(None, min_length=6)
    role: Role | None = None
    department: str | None = None
    language: str | None = Field(None, pattern="^(uz|ru)$")
    is_active: bool | None = None


class MeUpdate(BaseModel):
    full_name: str | None = None
    language: str | None = Field(None, pattern="^(uz|ru)$")


# --- courses ---

class LessonIn(BaseModel):
    title: str
    content: str = ""
    video_url: str | None = None
    position: int | None = None


class LessonUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    video_url: str | None = None
    position: int | None = None


class LessonOut(ORM):
    id: int
    position: int
    title: str
    content: str
    video_url: str | None
    completed: bool = False


class QuestionIn(BaseModel):
    text: str
    options: list[str] = Field(min_length=2)
    correct_index: int = Field(ge=0)
    explanation: str = ""
    position: int | None = None


class QuestionUpdate(BaseModel):
    text: str | None = None
    options: list[str] | None = Field(None, min_length=2)
    correct_index: int | None = Field(None, ge=0)
    explanation: str | None = None
    position: int | None = None


class QuestionPublic(ORM):
    """Question as an employee sees it: no answer."""
    id: int
    position: int
    text: str
    options: list[str]


class QuestionOut(QuestionPublic):
    correct_index: int
    explanation: str


class CourseIn(BaseModel):
    title: str
    description: str = ""
    language: str = Field("uz", pattern="^(uz|ru)$")
    pass_score: int = Field(70, ge=0, le=100)


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    language: str | None = Field(None, pattern="^(uz|ru)$")
    pass_score: int | None = Field(None, ge=0, le=100)


class CourseSummary(ORM):
    id: int
    title: str
    description: str
    language: str
    status: CourseStatus
    pass_score: int
    source_filename: str | None
    created_at: datetime
    lesson_count: int = 0
    question_count: int = 0
    completed_lessons: int = 0
    best_score: int | None = None
    passed: bool = False


class CourseDetail(CourseSummary):
    lessons: list[LessonOut]
    questions: list[QuestionOut] | list[QuestionPublic]


# --- tests ---

class AttemptIn(BaseModel):
    # question_id -> chosen option index
    answers: dict[int, int]


class AttemptResultItem(BaseModel):
    question_id: int
    chosen_index: int | None
    correct_index: int
    is_correct: bool
    explanation: str


class AttemptOut(BaseModel):
    id: int
    score: int
    correct: int
    total: int
    passed: bool
    created_at: datetime
    results: list[AttemptResultItem] = []


class ProgressItem(BaseModel):
    course_id: int
    title: str
    lesson_count: int
    completed_lessons: int
    best_score: int | None
    passed: bool
