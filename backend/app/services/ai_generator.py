"""Draft a course (lessons + test) from a company document with the Claude API.

The draft is always reviewed by an admin before it is published (hybrid flow).
"""
import base64

import anthropic
from pydantic import BaseModel

from ..config import get_settings
from .documents import SourceDocument

LANGUAGE_NAMES = {"uz": "Uzbek (Latin script)", "ru": "Russian"}

SYSTEM_PROMPT = """You are an instructional designer building internal training courses for a company's \
customer-support operators. Operators use what they learn every day: talking to clients, explaining \
problems clearly, fixing problems, and quickly finding the information a client needs.

From the source document, build a practical course:
- Split the material into short, focused lessons (usually 3-8) that follow a logical order.
- Write each lesson in Markdown: a short intro, the key rules or steps, and at least one realistic \
example of a client conversation or situation that shows how to apply them.
- Stay faithful to the document. Do not invent company policies, prices, or procedures that are not in it.
- Write multiple-choice test questions that check whether an operator can apply the material in a real \
situation, not just recall wording. Each question has 3-4 options with exactly one correct answer and a \
one-sentence explanation of why it is correct."""


class LessonDraft(BaseModel):
    title: str
    content: str


class QuestionDraft(BaseModel):
    text: str
    options: list[str]
    correct_index: int
    explanation: str


class CourseDraft(BaseModel):
    title: str
    description: str
    lessons: list[LessonDraft]
    questions: list[QuestionDraft]


class GenerationError(RuntimeError):
    pass


def _source_block(source: SourceDocument) -> dict:
    if source.pdf is not None:
        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": base64.b64encode(source.pdf).decode(),
            },
            "title": source.filename,
        }
    return {
        "type": "document",
        "source": {"type": "text", "media_type": "text/plain", "data": source.text},
        "title": source.filename,
    }


def generate_course(
    source: SourceDocument, language: str, num_questions: int, instructions: str = ""
) -> CourseDraft:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise GenerationError("ANTHROPIC_API_KEY is not set in .env")

    request = (
        f"Build the course from this document. Write everything (titles, lessons, questions, options, "
        f"explanations) in {LANGUAGE_NAMES[language]}. Create exactly {num_questions} test questions."
    )
    if instructions.strip():
        request += f"\n\nExtra instructions from the course admin:\n{instructions.strip()}"

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.parse(
            model=settings.anthropic_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            output_config={"effort": "medium"},
            messages=[{"role": "user", "content": [_source_block(source), {"type": "text", "text": request}]}],
            output_format=CourseDraft,
        )
    except anthropic.AuthenticationError as e:
        raise GenerationError("Claude API key is invalid") from e
    except anthropic.RateLimitError as e:
        raise GenerationError("Claude API rate limit reached, try again later") from e
    except anthropic.APIStatusError as e:
        raise GenerationError(f"Claude API error ({e.status_code}): {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise GenerationError("Could not reach the Claude API") from e

    if response.stop_reason == "refusal":
        raise GenerationError("Claude declined to process this document")
    if response.stop_reason == "max_tokens":
        raise GenerationError("Document is too large to turn into one course; split it into parts")
    draft = response.parsed_output
    if draft is None or not draft.lessons:
        raise GenerationError("Claude returned an empty course")
    return draft
