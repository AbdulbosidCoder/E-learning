from app.services import ai_generator
from app.services.ai_generator import CourseDraft, LessonDraft, QuestionDraft


def test_login_and_roles(client, admin, employee):
    assert client.post("/api/auth/login", json={"email": "admin@company.uz", "password": "bad"}).status_code == 401
    assert client.get("/api/auth/me", headers=admin).json()["role"] == "admin"
    assert client.get("/api/auth/me", headers=employee).json()["role"] == "employee"
    # employees cannot manage users or courses
    assert client.get("/api/users", headers=employee).status_code == 403
    assert client.post("/api/courses", json={"title": "x"}, headers=employee).status_code == 403
    assert client.get("/api/courses").status_code == 401


def test_company_domain_enforced(client, admin):
    r = client.post("/api/users", json={"email": "x@gmail.com", "password": "secret123"}, headers=admin)
    assert r.status_code == 422


def test_course_flow(client, admin, employee):
    course = client.post("/api/courses", json={"title": "Mijozlar bilan ishlash"}, headers=admin).json()
    cid = course["id"]
    lesson = client.post(f"/api/courses/{cid}/lessons", json={"title": "Salomlashish", "content": "# Hi"}, headers=admin).json()
    q1 = client.post(
        f"/api/courses/{cid}/questions",
        json={"text": "2+2?", "options": ["3", "4"], "correct_index": 1, "explanation": "math"},
        headers=admin,
    ).json()
    q2 = client.post(
        f"/api/courses/{cid}/questions",
        json={"text": "Sky?", "options": ["blue", "green"], "correct_index": 0},
        headers=admin,
    ).json()
    bad = client.post(f"/api/courses/{cid}/questions", json={"text": "?", "options": ["a", "b"], "correct_index": 5}, headers=admin)
    assert bad.status_code == 422

    # draft is hidden from employees
    assert client.get(f"/api/courses/{cid}", headers=employee).status_code == 404
    assert client.post(f"/api/courses/{cid}/publish", headers=admin).json()["status"] == "published"

    detail = client.get(f"/api/courses/{cid}", headers=employee).json()
    assert "correct_index" not in detail["questions"][0]

    assert client.post(f"/api/lessons/{lesson['id']}/complete", headers=employee).json()["completed"]
    r = client.post(f"/api/courses/{cid}/attempts", json={"answers": {q1["id"]: 1, q2["id"]: 1}}, headers=employee).json()
    assert (r["correct"], r["total"], r["score"], r["passed"]) == (1, 2, 50, False)

    progress = client.get("/api/progress/me", headers=employee).json()
    item = next(p for p in progress if p["course_id"] == cid)
    assert item["completed_lessons"] == 1 and item["best_score"] == 50


def test_video_upload(client, admin):
    cid = client.post("/api/courses", json={"title": "Video"}, headers=admin).json()["id"]
    lid = client.post(f"/api/courses/{cid}/lessons", json={"title": "L1"}, headers=admin).json()["id"]
    r = client.post(f"/api/lessons/{lid}/video", files={"file": ("a.mp4", b"\x00\x01", "video/mp4")}, headers=admin)
    url = r.json()["video_url"]
    assert url.startswith("/uploads/videos/") and client.get(url).content == b"\x00\x01"
    r = client.post(f"/api/lessons/{lid}/video", files={"file": ("a.exe", b"x", "application/octet-stream")}, headers=admin)
    assert r.status_code == 422


def test_generate_course_from_document(client, admin, monkeypatch):
    captured = {}

    def fake_generate(source, language, num_questions, instructions=""):
        captured.update(text=source.text, language=language, n=num_questions)
        return CourseDraft(
            title="Shikoyatlar",
            description="d",
            lessons=[LessonDraft(title="L1", content="c1"), LessonDraft(title="L2", content="c2")],
            questions=[
                QuestionDraft(text="q", options=["a", "b", "c"], correct_index=2, explanation="e"),
                QuestionDraft(text="broken", options=["a"], correct_index=4, explanation=""),
            ],
        )

    monkeypatch.setattr(ai_generator, "generate_course", fake_generate)
    r = client.post(
        "/api/courses/generate",
        files={"file": ("faq.txt", "Mijoz qo'ng'iroq qilsa...".encode(), "text/plain")},
        data={"language": "uz", "num_questions": "5"},
        headers=admin,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "draft" and len(body["lessons"]) == 2
    assert len(body["questions"]) == 1  # invalid question dropped
    assert captured == {"text": "Mijoz qo'ng'iroq qilsa...", "language": "uz", "n": 5}


def test_generate_without_api_key(client, admin):
    r = client.post(
        "/api/courses/generate",
        files={"file": ("faq.txt", b"hello", "text/plain")},
        headers=admin,
    )
    assert r.status_code == 502 and "ANTHROPIC_API_KEY" in r.json()["detail"]


def test_generate_rejects_unknown_format(client, admin):
    r = client.post("/api/courses/generate", files={"file": ("a.xlsx", b"x", "application/octet-stream")}, headers=admin)
    assert r.status_code == 422
