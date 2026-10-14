import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'

export function ProgressBar({ value, total }) {
  const pct = total ? Math.round((value * 100) / total) : 0
  return (
    <div className="progress" title={`${value}/${total}`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Courses() {
  const { t } = useI18n()
  const [courses, setCourses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/courses')
      .then((all) => setCourses(all.filter((c) => c.status === 'published')))
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="error">{error}</div>
  if (!courses) return null

  return (
    <>
      <h1>{t('myCourses')}</h1>
      {courses.length === 0 && <p className="muted">{t('noCourses')}</p>}
      <div className="grid">
        {courses.map((c) => (
          <Link to={`/courses/${c.id}`} key={c.id} className="card course-card">
            <h3>{c.title}</h3>
            <p className="muted clamp">{c.description}</p>
            <ProgressBar value={c.completed_lessons} total={c.lesson_count} />
            <div className="row between small">
              <span>{t('lessons')}: {c.completed_lessons}/{c.lesson_count}</span>
              {c.best_score !== null && (
                <span className={c.passed ? 'badge ok' : 'badge warn'}>
                  {c.passed ? t('passed') : t('notPassed')} · {c.best_score}%
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
