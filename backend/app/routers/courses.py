import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import Course, CourseStatus, Lesson, LessonCompletion, Question, Role, TestAttempt, User
from ..schemas import (
    AttemptIn,
    AttemptOut,
    AttemptResultItem,
    CourseDetail,
    CourseIn,
    CourseSummary,
    CourseUpdate,
    LessonIn,
    LessonOut,
    LessonUpdate,
    ProgressItem,
    QuestionIn,
    QuestionOut,
    QuestionPublic,
    QuestionUpdate,
)
from ..services import ai_generator, documents

router = APIRouter(prefix="/api", tags=["courses"])

VIDEO_TYPES = {".mp4", ".webm", ".mov", ".m4v", ".ogg"}


# --- helpers ---

def _get_course(db: Session, course_id: int, user: User) -> Course:
    course = db.get(Course, course_id)
    if not course or (course.status != CourseStatus.published and user.role != Role.admin):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    return course


def _get_lesson(db: Session, lesson_id: int) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lesson not found")
    return lesson


def _get_question(db: Session, question_id: int) -> Question:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question


def _completed_lesson_ids(db: Session, user: User, course: Course) -> set[int]:
    lesson_ids = [lesson.id for lesson in course.lessons]
    if not lesson_ids:
        return set()
    return set(
        db.scalars(
            select(LessonCompletion.lesson_id).where(
                LessonCompletion.user_id == user.id, LessonCompletion.lesson_id.in_(lesson_ids)
            )
        )
    )


def _best_attempt(db: Session, user: User, course: Course) -> TestAttempt | None:
    return db.scalar(
        select(TestAttempt)
        .where(TestAttempt.user_id == user.id, TestAttempt.course_id == course.id)
        .order_by(TestAttempt.score.desc(), TestAttempt.id.desc())
        .limit(1)
    )


def _summary(db: Session, user: User, course: Course, cls=CourseSummary, **extra):
    best = _best_attempt(db, user, course)
    return cls(
        id=course.id,
        title=course.title,
        description=course.description,
        language=course.language,
        status=course.status,
        pass_score=course.pass_score,
        source_filename=course.source_filename,
        created_at=course.created_at,
        lesson_count=len(course.lessons),
        question_count=len(course.questions),
        completed_lessons=len(_completed_lesson_ids(db, user, course)),
        best_score=best.score if best else None,
        passed=bool(best and best.passed),
        **extra,
    )


def _detail(db: Session, user: User, course: Course) -> CourseDetail:
    done = _completed_lesson_ids(db, user, course)
    lessons = [LessonOut.model_validate(l).model_copy(update={"completed": l.id in done}) for l in course.lessons]
    q_model = QuestionOut if user.role == Role.admin else QuestionPublic
    questions = [q_model.model_validate(q) for q in course.questions]
    return _summary(db, user, course, CourseDetail, lessons=lessons, questions=questions)


def _next_position(items) -> int:
    return max((i.position for i in items), default=-1) + 1


# --- courses ---

@router.get("/courses", response_model=list[CourseSummary])
def list_courses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(Course).order_by(Course.created_at.desc())
    if user.role != Role.admin:
        query = query.where(Course.status == CourseStatus.published)
    return [_summary(db, user, c) for c in db.scalars(query)]


@router.post("/courses", response_model=CourseDetail, status_code=status.HTTP_201_CREATED)
def create_course(data: CourseIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = Course(**data.model_dump(), created_by_id=user.id)
    db.add(course)
    db.commit()
    return _detail(db, user, course)


@router.post("/courses/generate", response_model=CourseDetail, status_code=status.HTTP_201_CREATED)
async def generate_course(
    file: UploadFile = File(...),
    language: str = Form("uz"),
    num_questions: int = Form(10),
    instructions: str = Form(""),
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload a PDF / DOCX / TXT document and let Claude draft a course (lessons + test).

    The course is saved as a draft so an admin can review and edit it before publishing.
    """
    if language not in ("uz", "ru"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "language must be uz or ru")
    num_questions = max(3, min(num_questions, 30))
    raw = await file.read()
    try:
        source = documents.load(file.filename or "document", raw)
    except documents.UnsupportedDocument as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))

    try:
        draft = ai_generator.generate_course(source, language, num_questions, instructions)
    except ai_generator.GenerationError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))

    course = Course(
        title=draft.title,
        description=draft.description,
        language=language,
        source_filename=file.filename,
        created_by_id=user.id,
    )
    course.lessons = [
        Lesson(position=i, title=l.title, content=l.content) for i, l in enumerate(draft.lessons)
    ]
    course.questions = [
        Question(
            position=i,
            text=q.text,
            options=q.options,
            correct_index=q.correct_index,
            explanation=q.explanation,
        )
        for i, q in enumerate(draft.questions)
        if 0 <= q.correct_index < len(q.options)
    ]
    db.add(course)
    db.commit()
    return _detail(db, user, course)


@router.get("/courses/{course_id}", response_model=CourseDetail)
def get_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _detail(db, user, _get_course(db, course_id, user))


@router.patch("/courses/{course_id}", response_model=CourseDetail)
def update_course(
    course_id: int, data: CourseUpdate, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    course = _get_course(db, course_id, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)
    db.commit()
    return _detail(db, user, course)


@router.post("/courses/{course_id}/publish", response_model=CourseDetail)
def publish_course(course_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = _get_course(db, course_id, user)
    if not course.lessons:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Course has no lessons")
    course.status = CourseStatus.published
    db.commit()
    return _detail(db, user, course)


@router.post("/courses/{course_id}/unpublish", response_model=CourseDetail)
def unpublish_course(course_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = _get_course(db, course_id, user)
    course.status = CourseStatus.draft
    db.commit()
    return _detail(db, user, course)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    db.delete(_get_course(db, course_id, user))
    db.commit()


# --- lessons ---

@router.post("/courses/{course_id}/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def add_lesson(course_id: int, data: LessonIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    course = _get_course(db, course_id, user)
    values = data.model_dump()
    if values["position"] is None:
        values["position"] = _next_position(course.lessons)
    lesson = Lesson(course_id=course.id, **values)
    db.add(lesson)
    db.commit()
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=LessonOut, dependencies=[Depends(require_admin)])
def update_lesson(lesson_id: int, data: LessonUpdate, db: Session = Depends(get_db)):
    lesson = _get_lesson(db, lesson_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    db.commit()
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db.delete(_get_lesson(db, lesson_id))
    db.commit()


@router.post("/lessons/{lesson_id}/video", response_model=LessonOut, dependencies=[Depends(require_admin)])
async def upload_video(lesson_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    lesson = _get_lesson(db, lesson_id)
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in VIDEO_TYPES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unsupported video type: {ext or 'unknown'}")
    video_dir = os.path.join(get_settings().upload_dir, "videos")
    os.makedirs(video_dir, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(video_dir, name), "wb") as out:
        while chunk := await file.read(1024 * 1024):
            out.write(chunk)
    lesson.video_url = f"/uploads/videos/{name}"
    db.commit()
    return lesson


@router.post("/lessons/{lesson_id}/complete", response_model=LessonOut)
def complete_lesson(lesson_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = _get_lesson(db, lesson_id)
    _get_course(db, lesson.course_id, user)
    exists = db.scalar(
        select(LessonCompletion).where(LessonCompletion.user_id == user.id, LessonCompletion.lesson_id == lesson.id)
    )
    if not exists:
        db.add(LessonCompletion(user_id=user.id, lesson_id=lesson.id))
        db.commit()
    return LessonOut.model_validate(lesson).model_copy(update={"completed": True})


# --- questions ---

def _check_correct_index(options: list[str], correct_index: int) -> None:
    if correct_index >= len(options):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "correct_index is out of range")


@router.post("/courses/{course_id}/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(
    course_id: int, data: QuestionIn, user: User = Depends(require_admin), db: Session = Depends(get_db)
):
    course = _get_course(db, course_id, user)
    _check_correct_index(data.options, data.correct_index)
    values = data.model_dump()
    if values["position"] is None:
        values["position"] = _next_position(course.questions)
    question = Question(course_id=course.id, **values)
    db.add(question)
    db.commit()
    return question


@router.patch("/questions/{question_id}", response_model=QuestionOut, dependencies=[Depends(require_admin)])
def update_question(question_id: int, data: QuestionUpdate, db: Session = Depends(get_db)):
    question = _get_question(db, question_id)
    changes = data.model_dump(exclude_unset=True)
    _check_correct_index(
        changes.get("options", question.options), changes.get("correct_index", question.correct_index)
    )
    for field, value in changes.items():
        setattr(question, field, value)
    db.commit()
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_question(question_id: int, db: Session = Depends(get_db)):
    db.delete(_get_question(db, question_id))
    db.commit()


# --- tests & progress ---

@router.post("/courses/{course_id}/attempts", response_model=AttemptOut, status_code=status.HTTP_201_CREATED)
def submit_attempt(
    course_id: int, data: AttemptIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    course = _get_course(db, course_id, user)
    if not course.questions:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Course has no test")
    results = []
    for q in course.questions:
        chosen = data.answers.get(q.id)
        results.append(
            AttemptResultItem(
                question_id=q.id,
                chosen_index=chosen,
                correct_index=q.correct_index,
                is_correct=chosen == q.correct_index,
                explanation=q.explanation,
            )
        )
    correct = sum(r.is_correct for r in results)
    total = len(results)
    score = round(correct * 100 / total)
    attempt = TestAttempt(
        user_id=user.id,
        course_id=course.id,
        score=score,
        correct=correct,
        total=total,
        passed=score >= course.pass_score,
        answers={str(k): v for k, v in data.answers.items()},
    )
    db.add(attempt)
    db.commit()
    return AttemptOut(
        id=attempt.id,
        score=score,
        correct=correct,
        total=total,
        passed=attempt.passed,
        created_at=attempt.created_at,
        results=results,
    )


@router.get("/progress/me", response_model=list[ProgressItem])
def my_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    courses = db.scalars(select(Course).where(Course.status == CourseStatus.published).order_by(Course.id))
    items = []
    for course in courses:
        s = _summary(db, user, course)
        items.append(
            ProgressItem(
                course_id=course.id,
                title=course.title,
                lesson_count=s.lesson_count,
                completed_lessons=s.completed_lessons,
                best_score=s.best_score,
                passed=s.passed,
            )
        )
    return items
