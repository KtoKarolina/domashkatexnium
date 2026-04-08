import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { RequireAuth } from './components/RequireAuth.jsx'
import { ForecastPage } from './pages/ForecastPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LegalPage } from './pages/LegalPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { OnboardingPage } from './pages/OnboardingPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { SubscribePage } from './pages/SubscribePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="subscribe" element={<SubscribePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="compatibility" element={<Navigate to="/" replace />} />
        <Route path="legal" element={<LegalPage />} />
      </Route>
    </Routes>
  )
}
