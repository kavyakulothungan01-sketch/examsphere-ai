import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// ── Administration Portal Pages ──────────────────────────────────────────────
import CollegeAdminLoginPage from './pages/auth/CollegeAdminLoginPage';
import CollegeAdminRegisterPage from './pages/auth/CollegeAdminRegisterPage';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';

// ── Normal User Portal Auth Pages ───────────────────────────────────────────
import LoginPage from './pages/LoginPage';                                    // Role Selection
import TeacherLoginPage from './pages/auth/TeacherLoginPage';
import InvigilatorLoginPage from './pages/auth/InvigilatorLoginPage';
import StudentLoginPage from './pages/auth/StudentLoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// ── Feature Pages ────────────────────────────────────────────────────────────
import TeacherDashboard from './pages/TeacherDashboard';
import InvigilatorDashboard from './pages/InvigilatorDashboard';
import InvigilatorQuestionPaperView from './pages/InvigilatorQuestionPaperView';
import StudentDashboard from './pages/StudentDashboard';
import ProfilePage from './pages/ProfilePage';
import ExamCreationPage from './pages/ExamCreationPage';
import ExamEditPage from './pages/ExamEditPage';
import ExamListPage from './pages/ExamListPage';
import ExamDetailsPage from './pages/ExamDetailsPage';
import UploadQuestionPaperPage from './pages/UploadQuestionPaperPage';
import CreateQuestionPaperPage from './pages/CreateQuestionPaperPage';
import ManageQuestionPapersPage from './pages/ManageQuestionPapersPage';
import ReviewExtractedPaperPage from './pages/ReviewExtractedPaperPage';
import ExamTakePage from './pages/ExamTakePage';

// ── Shared layout for authenticated pages ────────────────────────────────────
const AppLayout = ({ children }) => (
  <div className="app-container">
    <Sidebar />
    <div className="main-content">
      <Header />
      <main className="page-body">{children}</main>
    </div>
  </div>
);

// ── Redirect logged-in users to their respective role dashboard ─────────────
const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const role = user?.role ? user.role.toLowerCase() : '';
  if (role === 'college_admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (role === 'invigilator') return <Navigate to="/invigilator/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <BrowserRouter>
          <Routes>
            {/* ── ADMINISTRATION PORTAL ───────────────────────────── */}
            <Route path="/admin/login" element={<CollegeAdminLoginPage />} />
            <Route path="/admin/register" element={<CollegeAdminRegisterPage />} />

            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['college_admin', 'COLLEGE_ADMIN']}>
                <AppLayout><CollegeAdminDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute allowedRoles={['college_admin', 'COLLEGE_ADMIN']}>
                <AppLayout><ProfilePage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/exams/create" element={
              <ProtectedRoute allowedRoles={['college_admin', 'COLLEGE_ADMIN']}>
                <AppLayout><ExamCreationPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/exams/edit/:id" element={
              <ProtectedRoute allowedRoles={['college_admin', 'COLLEGE_ADMIN']}>
                <AppLayout><ExamEditPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/exams/details/:id" element={
              <ProtectedRoute allowedRoles={['college_admin', 'COLLEGE_ADMIN']}>
                <AppLayout><ExamDetailsPage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/auth/admin/forgot-password" element={<ForgotPasswordPage role="college_admin" />} />

            {/* ── NORMAL USER PORTAL ──────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/teacher" element={<TeacherLoginPage />} />
            <Route path="/auth/invigilator" element={<InvigilatorLoginPage />} />
            <Route path="/auth/student" element={<StudentLoginPage />} />

            {/* ── Password Reset (shared, role read from DB) ─────── */}
            <Route path="/auth/teacher/forgot-password" element={<ForgotPasswordPage role="teacher" />} />
            <Route path="/auth/invigilator/forgot-password" element={<ForgotPasswordPage role="invigilator" />} />
            <Route path="/auth/student/forgot-password" element={<ForgotPasswordPage role="student" />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

            {/* ── Teacher Protected Routes ───────────────────────── */}
            <Route path="/teacher/dashboard" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><TeacherDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/teacher/profile" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><ProfilePage /></AppLayout>
              </ProtectedRoute>
            } />
            {/* Teachers can view exam details (e.g. for invigilation) but cannot create exams */}
            <Route path="/teacher/exams/details/:id" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER', 'invigilator', 'INVIGILATOR']}>
                <AppLayout><ExamDetailsPage /></AppLayout>
              </ProtectedRoute>
            } />
            {/* Block /teacher/exams/create — redirect to teacher dashboard */}
            <Route path="/teacher/exams/create" element={<Navigate to="/teacher/dashboard" replace />} />
            {/* Upload question paper */}
            <Route path="/teacher/upload" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><UploadQuestionPaperPage /></AppLayout>
              </ProtectedRoute>
            } />
            {/* Create structured question paper */}
            <Route path="/teacher/question-papers/create" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><CreateQuestionPaperPage /></AppLayout>
              </ProtectedRoute>
            } />
            {/* Manage question papers */}
            <Route path="/teacher/question-papers" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><ManageQuestionPapersPage /></AppLayout>
              </ProtectedRoute>
            } />
            {/* Review Extracted question paper */}
            <Route path="/teacher/question-papers/extract/:id" element={
              <ProtectedRoute allowedRoles={['teacher', 'TEACHER']}>
                <AppLayout><ReviewExtractedPaperPage /></AppLayout>
              </ProtectedRoute>
            } />

            {/* ── Invigilator Protected Routes ───────────────────── */}
            <Route path="/invigilator/dashboard" element={
              <ProtectedRoute allowedRoles={['invigilator', 'INVIGILATOR']}>
                <AppLayout><InvigilatorDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/invigilator/profile" element={
              <ProtectedRoute allowedRoles={['invigilator', 'INVIGILATOR']}>
                <AppLayout><ProfilePage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/invigilator/exam/:examId/question-paper" element={
              <ProtectedRoute allowedRoles={['invigilator', 'INVIGILATOR']}>
                <AppLayout><InvigilatorQuestionPaperView /></AppLayout>
              </ProtectedRoute>
            } />

            {/* ── Student Protected Routes ────────────────────────── */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRoles={['student', 'STUDENT']}>
                <AppLayout><StudentDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/student/profile" element={
              <ProtectedRoute allowedRoles={['student', 'STUDENT']}>
                <AppLayout><ProfilePage /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/student/exam/take/:examId" element={
              <ProtectedRoute allowedRoles={['student', 'STUDENT']}>
                <AppLayout><ExamTakePage /></AppLayout>
              </ProtectedRoute>
            } />

            {/* ── Catch-all & Root ────────────────────────────────── */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AccessibilityProvider>
    </AuthProvider>
  );
}

export default App;
