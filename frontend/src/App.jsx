// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';


// Pages principales
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

// Pages de ressources
import SchedulesList from '@/pages/SchedulesList';
import DriversList from '@/pages/DriversList';
import DriverDetail from '@/pages/DriverDetail';
import PaymentsList from '@/pages/PaymentsList';
import PaymentDetail from './pages/PaymentDetail';
import VehiclesList from '@/pages/VehiclesList';
import VehicleDetail from '@/pages/VehicleDetail';
import MaintenancesList from './pages/MaintenancesList';
import MaintenanceDetail from './pages/MaintenanceDetail';
import HistoryList from '@/pages/HistoryList';

// Pages d'erreur
import ErrorPage from '@/pages/ErrorPage';
import Error400 from '@/pages/Error400';
import Error401 from '@/pages/Error401';
import Error403 from '@/pages/Error403';
import Error404 from '@/pages/Error404';
import Error500 from '@/pages/Error500';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Routes d'erreur */}
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/error/400" element={<Error400 />} />
          <Route path="/error/401" element={<Error401 />} />
          <Route path="/error/403" element={<Error403 />} />
          <Route path="/error/404" element={<Error404 />} />
          <Route path="/error/500" element={<Error500 />} />
          <Route path="/error/:code" element={<ErrorPage />} />

          {/* Routes protégées */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />

            {/* Routes avec restriction de rôle */}
            <Route path="vehicles" element={
              <ProtectedRoute requiredRole="manager">
                <VehiclesList />
              </ProtectedRoute>
            } />

            <Route path="/vehicles/:id" element={
              <ProtectedRoute requiredRole="manager">
                <VehicleDetail />
              </ProtectedRoute>
            } />

            <Route path="drivers" element={
              <ProtectedRoute requiredRole="manager">
                <DriversList />
              </ProtectedRoute>
            } />

            <Route path="/drivers/:id" element={
              <ProtectedRoute requiredRole="manager">
                <DriverDetail />
              </ProtectedRoute>
            } />

            <Route path="schedules" element={
              <ProtectedRoute requiredRole="manager">
                <SchedulesList />
              </ProtectedRoute>
            } />

            <Route path="payments" element={
              <ProtectedRoute requiredRole="manager">
                <PaymentsList />
              </ProtectedRoute>
            } />

            <Route path="payments/:id" element={
              <ProtectedRoute requiredRole="manager">
                <PaymentDetail />
              </ProtectedRoute>
            } />

            <Route path="maintenances" element={
              <ProtectedRoute requiredRole="manager">
                <MaintenancesList />
              </ProtectedRoute>
            } />

            <Route path="maintenances/:id" element={
              <ProtectedRoute requiredRole="manager">
                <MaintenanceDetail />
              </ProtectedRoute>
            } />

            <Route path="history" element={
              <ProtectedRoute requiredRole="manager">
                <HistoryList />
              </ProtectedRoute>
            } />

            {/* Fallback pour les routes non trouvées à l'intérieur de l'application */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Fallback pour les routes non trouvées en dehors de l'application */}
          <Route path="*" element={<Error404 />} />
        </Routes>
        <Toaster />
      </ErrorBoundary>
    </Router>
  );
}

export default App;