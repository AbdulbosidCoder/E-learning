import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api.js'
import { LessonContent, Video } from '../../components.jsx'
import { useI18n } from '../../i18n.jsx'

function LessonEditor({ lesson, onChange, onDelete }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(lesson)
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState('')
  const dirty = draft.title !== lesson.title || draft.content !== lesson.content || (draft.video_url || '') !== (lesson.video_url || '')

  const save = async () => {
    const saved = await api(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      body: { title: draft.title, content: draft.content, video_url: draft.video_url || null },
    })
    onChange(saved)
    setStatus(t('saved'))
  }

  const upload = async (file) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setStatus(t('uploading'))
    try {
      const saved = await api(`/api/lessons/${lesson.id}/video`, { method: 'POST', form })
      onChange(saved)
      setDraft({ ...draft, video_url: saved.video_url })
      setStatus(t('saved'))
    } catch (e) {
      setStatus(e.message)
    }
  }

  return (
    <div className="card">
      <input className="title-input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <div className="row">
        <label className="grow">
          {t('videoUrl')}
          <input value={draft.video_url || ''} placeholder="https://youtube.com/..." onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} />
        </label>
        <label>
          {t('uploadVideo')}
          <input type="file" accept="video/*" onChange={(e) => upload(e.target.files[0])} />
        </label>
      </div>
      <Video url={lesson.video_url} />
      <div className="row">
        <button className={`tab ${!preview ? 'active' : ''}`} onClick={() => setPreview(false)}>{t('edit')}</button>
        <button className={`tab ${preview ? 'active' : ''}`} onClick={() => setPreview(true)}>👁</button>
      </div>
      {preview ? (
        <LessonContent content={draft.content} />
      ) : (
        <textarea rows="12" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
      )}
      <div className="row">
        <button className="primary" disabled={!dirty} onClick={save}>{t('save')}</button>
        <button className="danger" onClick={onDelete}>{t('delete')}</button>
        <span className="muted small">{status}</span>
      </div>
    </div>
  )
}

function QuestionEditor({ question, onChange, onDelete }) {
  const { t } = useI18n()
  const [text, setText] = useState(question.text)
  const [options, setOptions] = useState(question.options.join('\n'))
  const [correct, setCorrect] = useState(question.correct_index)
  const [explanation, setExplanation] = useState(question.explanation)
  const [status, setStatus] = useState('')
  const optionList = options.split('\n').map((o) => o.trim()).filter(Boolean)

  const save = async () => {
    try {
      const saved = await api(`/api/questions/${question.id}`, {
        method: 'PATCH',
        body: { text, options: optionList, correct_index: Number(correct), explanation },
      })
      onChange(saved)
      setStatus(t('saved'))
    } catch (e) {
      setStatus(e.message)
    }
  }

  return (
    <div className="card">
      <label>
        {t('questionText')}
        <textarea rows="2" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label>
        {t('options')}
        <textarea rows="4" value={options} onChange={(e) => setOptions(e.target.value)} />
      </label>
      <div className="row">
        <label>
          {t('correctOption')}
          <select value={correct} onChange={(e) => setCorrect(e.target.value)}>
            {optionList.map((o, i) => (
              <option key={i} value={i}>{i + 1}. {o}</option>
            ))}
          </select>
        </label>
        <label className="grow">
          {t('explanation')}
          <input value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button className="primary" onClick={save}>{t('save')}</button>
        <button className="danger" onClick={onDelete}>{t('delete')}</button>
        <span className="muted small">{status}</span>
      </div>
    </div>
  )
}

export default function CourseEditor() {
  const { id } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [meta, setMeta] = useState(null)
  const [tab, setTab] = useState('lessons')
  const [error, setError] = useState('')

  const load = (c) => {
    setCourse(c)
    setMeta({ title: c.title, description: c.description, language: c.language, pass_score: c.pass_score })
  }

  useEffect(() => {
    api(`/api/courses/${id}`).then(load).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="error">{error}</div>
  if (!course) return null

  const run = async (fn) => {
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    }
  }

  const saveMeta = () => run(async () => load(await api(`/api/courses/${id}`, { method: 'PATCH', body: { ...meta, pass_score: Number(meta.pass_score) } })))
  const togglePublish = () =>
    run(async () => load(await api(`/api/courses/${id}/${course.status === 'published' ? 'unpublish' : 'publish'}`, { method: 'POST' })))
  const remove = () =>
    run(async () => {
      if (!window.confirm(t('confirmDelete'))) return
      await api(`/api/courses/${id}`, { method: 'DELETE' })
      navigate('/admin/courses')
    })

  const setLessons = (lessons) => setCourse((c) => ({ ...c, lessons }))
  const setQuestions = (questions) => setCourse((c) => ({ ...c, questions }))

  const addLesson = () =>
    run(async () => {
      const l = await api(`/api/courses/${id}/lessons`, { method: 'POST', body: { title: `${t('lesson')} ${course.lessons.length + 1}` } })
      setLessons([...course.lessons, l])
    })
  const addQuestion = () =>
    run(async () => {
      const q = await api(`/api/courses/${id}/questions`, {
        method: 'POST',
        body: { text: '?', options: ['A', 'B', 'C'], correct_index: 0 },
      })
      setQuestions([...course.questions, q])
    })

  return (
    <>
      <Link to="/admin/courses" className="small">← {t('back')}</Link>
      <div className="row between">
        <h1>{course.title}</h1>
        <div className="row">
          <span className={`badge ${course.status === 'published' ? 'ok' : ''}`}>{t(course.status)}</span>
          <button className="primary" onClick={togglePublish}>{course.status === 'published' ? t('unpublish') : t('publish')}</button>
          <button className="danger" onClick={remove}>{t('delete')}</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <div className="form-grid">
          <label className="span2">
            {t('title')}
            <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </label>
          <label>
            {t('language')}
            <select value={meta.language} onChange={(e) => setMeta({ ...meta, language: e.target.value })}>
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
            </select>
          </label>
          <label>
            {t('passScore')}
            <input type="number" min="0" max="100" value={meta.pass_score} onChange={(e) => setMeta({ ...meta, pass_score: e.target.value })} />
          </label>
        </div>
        <label>
          {t('description')}
          <textarea rows="2" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </label>
        <button className="primary" onClick={saveMeta}>{t('save')}</button>
        {course.source_filename && <span className="muted small"> {t('sourceFile')}: {course.source_filename}</span>}
      </div>

      <div className="row">
        <button className={`tab ${tab === 'lessons' ? 'active' : ''}`} onClick={() => setTab('lessons')}>{t('lessons')} ({course.lessons.length})</button>
        <button className={`tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>{t('questions')} ({course.questions.length})</button>
      </div>

      {tab === 'lessons' && (
        <>
          {course.lessons.map((l) => (
            <LessonEditor
              key={l.id}
              lesson={l}
              onChange={(saved) => setLessons(course.lessons.map((x) => (x.id === saved.id ? { ...x, ...saved } : x)))}
              onDelete={() =>
                run(async () => {
                  if (!window.confirm(t('confirmDelete'))) return
                  await api(`/api/lessons/${l.id}`, { method: 'DELETE' })
                  setLessons(course.lessons.filter((x) => x.id !== l.id))
                })
              }
            />
          ))}
          <button onClick={addLesson}>+ {t('addLesson')}</button>
        </>
      )}
      {tab === 'questions' && (
        <>
          {course.questions.map((q) => (
            <QuestionEditor
              key={q.id}
              question={q}
              onChange={(saved) => setQuestions(course.questions.map((x) => (x.id === saved.id ? saved : x)))}
              onDelete={() =>
                run(async () => {
                  await api(`/api/questions/${q.id}`, { method: 'DELETE' })
                  setQuestions(course.questions.filter((x) => x.id !== q.id))
                })
              }
            />
          ))}
          <button onClick={addQuestion}>+ {t('addQuestion')}</button>
        </>
      )}
    </>
  )
}
