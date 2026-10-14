import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { LessonContent, Video } from '../components.jsx'
import { useI18n } from '../i18n.jsx'
import { ProgressBar } from './Courses.jsx'

function TestPanel({ course }) {
  const { t } = useI18n()
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      setResult(await api(`/api/courses/${course.id}/attempts`, { method: 'POST', body: { answers } }))
      window.scrollTo(0, 0)
    } catch (e) {
      setError(e.message)
    }
  }

  const byId = Object.fromEntries((result?.results || []).map((r) => [r.question_id, r]))

  return (
    <div>
      {result && (
        <div className={`card result ${result.passed ? 'ok' : 'warn'}`}>
          <h2>
            {t('yourScore')}: {result.score}% ({result.correct}/{result.total})
          </h2>
          <p>{result.passed ? t('passed') : t('notPassed')}</p>
          <button
            onClick={() => {
              setResult(null)
              setAnswers({})
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
      {course.questions.map((q, i) => {
        const r = byId[q.id]
        return (
          <div className="card question" key={q.id}>
            <p className="q-text">
              {i + 1}. {q.text}
            </p>
            {q.options.map((opt, idx) => {
              let cls = 'option'
              if (r && idx === r.correct_index) cls += ' correct'
              else if (r && idx === r.chosen_index) cls += ' wrong'
              return (
                <label className={cls} key={idx}>
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    disabled={Boolean(result)}
                    checked={answers[q.id] === idx}
                    onChange={() => setAnswers({ ...answers, [q.id]: idx })}
                  />
                  {opt}
                </label>
              )
            })}
            {r && r.explanation && <p className="muted small">{r.explanation}</p>}
          </div>
        )
      })}
      {error && <div className="error">{error}</div>}
      {!result && (
        <button
          className="primary"
          disabled={Object.keys(answers).length < course.questions.length}
          onClick={submit}
        >
          {t('submit')}
        </button>
      )}
    </div>
  )
}

export default function CourseView() {
  const { id } = useParams()
  const { t } = useI18n()
  const [course, setCourse] = useState(null)
  const [selected, setSelected] = useState(0) // lesson index, or 'test'
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/courses/${id}`).then(setCourse).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="error">{error}</div>
  if (!course) return null

  const lesson = selected === 'test' ? null : course.lessons[selected]
  const done = course.lessons.filter((l) => l.completed).length

  const markDone = async () => {
    await api(`/api/lessons/${lesson.id}/complete`, { method: 'POST' })
    setCourse({
      ...course,
      lessons: course.lessons.map((l) => (l.id === lesson.id ? { ...l, completed: true } : l)),
    })
    if (selected < course.lessons.length - 1) setSelected(selected + 1)
    else if (course.questions.length) setSelected('test')
  }

  return (
    <>
      <Link to="/" className="small">← {t('back')}</Link>
      <h1>{course.title}</h1>
      <p className="muted">{course.description}</p>
      <div className="course-layout">
        <aside className="card sidebar">
          <ProgressBar value={done} total={course.lessons.length} />
          <ol>
            {course.lessons.map((l, i) => (
              <li key={l.id}>
                <button className={`side-item ${selected === i ? 'active' : ''}`} onClick={() => setSelected(i)}>
                  <span className={l.completed ? 'check on' : 'check'}>✓</span> {l.title}
                </button>
              </li>
            ))}
          </ol>
          {course.questions.length > 0 && (
            <button className={`side-item test ${selected === 'test' ? 'active' : ''}`} onClick={() => setSelected('test')}>
              📝 {t('test')} ({course.questions.length})
              {course.best_score !== null && ` · ${course.best_score}%`}
            </button>
          )}
        </aside>
        <section className="card lesson">
          {lesson && (
            <>
              <h2>{lesson.title}</h2>
              <Video url={lesson.video_url} />
              <LessonContent content={lesson.content} />
              <button className="primary" onClick={markDone} disabled={lesson.completed && selected === course.lessons.length - 1 && !course.questions.length}>
                {lesson.completed ? `✓ ${t('done')}` : t('markDone')}
              </button>
            </>
          )}
          {selected === 'test' && <TestPanel course={course} />}
        </section>
      </div>
    </>
  )
}
