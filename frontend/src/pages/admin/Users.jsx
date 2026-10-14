import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { useI18n } from '../../i18n.jsx'

const ROLES = ['employee', 'manager', 'admin']
const EMPTY = { email: '', full_name: '', password: '', role: 'employee', department: '', language: 'uz' }

export default function Users() {
  const { t } = useI18n()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/users').then(setUsers)
  }, [])

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const user = await api('/api/users', { method: 'POST', body: form })
      setUsers([...users, user])
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    }
  }

  const update = async (id, changes) => {
    setError('')
    try {
      const saved = await api(`/api/users/${id}`, { method: 'PATCH', body: changes })
      setUsers(users.map((u) => (u.id === id ? saved : u)))
    } catch (err) {
      setError(err.message)
    }
  }

  const field = (name) => ({ value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }) })

  return (
    <>
      <h1>{t('users')}</h1>
      <form className="card" onSubmit={create}>
        <h2>{t('newUser')}</h2>
        <div className="form-grid">
          <label>{t('email')}<input type="email" required {...field('email')} /></label>
          <label>{t('fullName')}<input {...field('full_name')} /></label>
          <label>{t('password')}<input type="password" minLength="6" required {...field('password')} /></label>
          <label>{t('department')}<input {...field('department')} /></label>
          <label>
            {t('role')}
            <select {...field('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
            </select>
          </label>
          <label>
            {t('language')}
            <select {...field('language')}>
              <option value="uz">O'zbekcha</option>
              <option value="ru">Русский</option>
            </select>
          </label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="primary">{t('add')}</button>
      </form>
      <table className="table">
        <thead>
          <tr>
            <th>{t('email')}</th>
            <th>{t('fullName')}</th>
            <th>{t('department')}</th>
            <th>{t('role')}</th>
            <th>{t('telegram')}</th>
            <th>{t('active')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={u.is_active ? '' : 'inactive'}>
              <td>{u.email}</td>
              <td>{u.full_name}</td>
              <td>{u.department}</td>
              <td>
                <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
                </select>
              </td>
              <td>{u.telegram_linked ? '✓' : '—'}</td>
              <td>
                <input type="checkbox" checked={u.is_active} onChange={(e) => update(u.id, { is_active: e.target.checked })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
