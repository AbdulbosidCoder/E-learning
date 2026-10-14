import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { useI18n } from './i18n.jsx'
import AdminCourses from './pages/admin/AdminCourses.jsx'
import CourseEditor from './pages/admin/CourseEditor.jsx'
import Users from './pages/admin/Users.jsx'
import CourseView from './pages/CourseView.jsx'
import Courses from './pages/Courses.jsx'
import Login from './pages/Login.jsx'

function LanguageSwitch() {
  const { lang } = useI18n()
  const { updateLanguage } = useAuth()
  return (
    <div className="lang-switch">
      {['uz', 'ru'].map((l) => (
        <button key={l} className={l === lang ? 'active' : ''} onClick={() => updateLanguage(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function Layout({ children }) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  return (
    <>
      <header className="topbar">
        <div className="brand">{t('appName')}</div>
        <nav>
          <NavLink to="/" end>{t('myCourses')}</NavLink>
          {user.role === 'admin' && <NavLink to="/admin/courses">{t('manageCourses')}</NavLink>}
          {user.role === 'admin' && <NavLink to="/admin/users">{t('users')}</NavLink>}
        </nav>
        <div className="topbar-right">
          <LanguageSwitch />
          <span className="muted small">
            {user.full_name || user.email} · {t(`role_${user.role}`)}
          </span>
          <button className="link" onClick={logout}>{t('logout')}</button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  )
}

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Courses /></Protected>} />
      <Route path="/courses/:id" element={<Protected><CourseView /></Protected>} />
      <Route path="/admin/courses" element={<Protected roles={['admin']}><AdminCourses /></Protected>} />
      <Route path="/admin/courses/:id" element={<Protected roles={['admin']}><CourseEditor /></Protected>} />
      <Route path="/admin/users" element={<Protected roles={['admin']}><Users /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
