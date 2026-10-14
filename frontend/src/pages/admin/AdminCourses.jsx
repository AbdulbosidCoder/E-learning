import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import { useI18n } from '../../i18n.jsx'

function GenerateForm() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [language, setLanguage] = useState(lang)
  const [numQuestions, setNumQuestions] = useState(10)
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData()
    form.append('file', file)
    form.append('language', language)
    form.append('num_questions', numQuestions)
    form.append('instructions', instructions)
    setBusy(true)
    setError('')
    try {
      const course = await api('/api/courses/generate', { method: 'POST', form })
      navigate(`/admin/courses/${course.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>✨ {t('generateTitle')}</h2>
      <p className="muted small">{t('generateHint')}</p>
      <div className="form-grid">
        <label>
          {t('file')}
          <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setFile(e.target.files[0])} required />
        </label>
        <label>
          {t('language')}
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="uz">O'zbekcha</option>
            <option value="ru">Русский</option>
          </select>
        </label>
        <label>
          {t('numQuestions')}
          <input type="number" min="3" max="30" value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} />
        </label>
      </div>
      <label>
        {t('instructions')}
        <textarea rows="2" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </label>
      {error && <div className="error">{error}</div>}
      <button className="primary" disabled={busy || !file}>{busy ? t('generating') : t('generate')}</button>
    </form>
  )
}

export default function AdminCourses() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])

  useEffect(() => {
    api('/api/courses').then(setCourses)
  }, [])

  const createManual = async () => {
    const course = await api('/api/courses', { method: 'POST', body: { title: t('newCourse') } })
    navigate(`/admin/courses/${course.id}`)
  }

  return (
    <>
      <div className="row between">
        <h1>{t('manageCourses')}</h1>
        <button onClick={createManual}>+ {t('manualCreate')}</button>
      </div>
      <GenerateForm />
      <table className="table">
        <thead>
          <tr>
            <th>{t('title')}</th>
            <th>{t('language')}</th>
            <th>{t('lessons')}</th>
            <th>{t('questions')}</th>
            <th>{t('sourceFile')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td>
                {c.title}{' '}
                <span className={`badge ${c.status === 'published' ? 'ok' : ''}`}>{t(c.status)}</span>
              </td>
              <td>{c.language.toUpperCase()}</td>
              <td>{c.lesson_count}</td>
              <td>{c.question_count}</td>
              <td className="muted small">{c.source_filename || '—'}</td>
              <td>
                <Link to={`/admin/courses/${c.id}`}>{t('edit')}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
