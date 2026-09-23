import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientProfilePage } from './pages/patient/PatientProfile';
import { PatientMedicalHistoryPage } from './pages/patient/PatientMedicalHistory';
import { PatientReportsPage } from './pages/patient/PatientReports';
import { PatientChatPage } from './pages/patient/PatientChat';
import { PatientHospitalsPage } from './pages/patient/PatientHospitals';
import { PatientAppointmentsPage } from './pages/patient/PatientAppointments';
import { PatientFeedbackPage } from './pages/patient/PatientFeedback';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminHospitalsPage } from './pages/admin/AdminHospitals';
import { AdminPatientsPage } from './pages/admin/AdminPatients';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/patient"
              element={
                <ProtectedRoute role="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/profile"
              element={
                <ProtectedRoute role="patient">
                  <PatientProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/medical-history"
              element={
                <ProtectedRoute role="patient">
                  <PatientMedicalHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/reports"
              element={
                <ProtectedRoute role="patient">
                  <PatientReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/chat"
              element={
                <ProtectedRoute role="patient">
                  <PatientChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/hospitals"
              element={
                <ProtectedRoute role="patient">
                  <PatientHospitalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute role="patient">
                  <PatientAppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/feedback"
              element={
                <ProtectedRoute role="patient">
                  <PatientFeedbackPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/patients"
              element={
                <ProtectedRoute role="admin">
                  <AdminPatientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hospitals"
              element={
                <ProtectedRoute role="admin">
                  <AdminHospitalsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}