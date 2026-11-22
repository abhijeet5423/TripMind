import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import ResendVerificationPage from './pages/ResendVerificationPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TripDetailPage from './pages/TripDetailPage.jsx'
import TripExportPage from './pages/TripExportPage.jsx'
import SharedTripPage from './pages/SharedTripPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import PublicOnlyRoute from './components/common/PublicOnlyRoute.jsx'
import { TripProvider } from './context/TripContext.jsx'
import AssistantLauncher from './components/assistant/AssistantLauncher.jsx'

/**
 * PublicLayout Component
 * Standard layout shell with sticky Navbar, main content canvas, and Footer.
 */
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-sand-ivory text-charcoal font-sans selection:bg-terracotta selection:text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

/**
 * App Component
 * Top-level application shell with React Router declarations and session boundaries.
 */
export default function App() {
  return (
    <>
      <Routes>
        {/* Editorial Landing Page */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <LandingPage />
            </PublicLayout>
          }
        />

        {/* Public Shared Itinerary Route (Accessible with cryptographic token) */}
        <Route
          path="/shared/:token"
          element={
            <PublicLayout>
              <SharedTripPage />
            </PublicLayout>
          }
        />

        {/* Dedicated About Us Page */}
        <Route
          path="/about"
          element={
            <PublicLayout>
              <AboutPage />
            </PublicLayout>
          }
        />

        {/* Guest-Only Authentication Pages */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />
        <Route
          path="/resend-verification"
          element={
            <PublicOnlyRoute>
              <ResendVerificationPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected Traveler Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <TripProvider>
                <DashboardPage />
              </TripProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripProvider>
                <TripDetailPage />
              </TripProvider>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id/export"
          element={
            <ProtectedRoute>
              <TripProvider>
                <TripExportPage />
              </TripProvider>
            </ProtectedRoute>
          }
        />

        {/* Wildcard Fallback (404 Not Found) */}
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFoundPage />
            </PublicLayout>
          }
        />
      </Routes>

      {/* Global AI Assistant Floating Launcher (Available across every page) */}
      <AssistantLauncher />
    </>
  )
}
