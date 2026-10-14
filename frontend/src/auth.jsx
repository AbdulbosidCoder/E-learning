import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'
import { useI18n } from './i18n.jsx'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const { setLang } = useI18n()

  const loadMe = useCallback(async () => {
    const me = await api('/api/auth/me')
    setUser(me)
    setLang(me.language)
    return me
  }, [setLang])

  useEffect(() => {
    if (!getToken()) return
    loadMe()
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [loadMe])

  const login = async (email, password) => {
    const { access_token } = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    setToken(access_token)
    return loadMe()
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const updateLanguage = async (language) => {
    setLang(language)
    if (user) setUser(await api('/api/auth/me', { method: 'PATCH', body: { language } }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateLanguage }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
