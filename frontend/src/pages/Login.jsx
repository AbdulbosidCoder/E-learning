import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { useI18n } from '../i18n.jsx'

export default function Login() {
  const { login } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch {
      setError(t('loginFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <div className="row between">
          <h1>{t('appName')}</h1>
          <div className="lang-switch">
            {['uz', 'ru'].map((l) => (
              <button type="button" key={l} className={l === lang ? 'active' : ''} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <label>
          {t('email')}
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t('password')}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>{t('login')}</button>
      </form>
    </div>
  )
}
