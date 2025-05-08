// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import SchedulesList from '@/pages/SchedulesList';
import DriversList from '@/pages/DriversList';
import DriverDetail from '@/pages/DriverDetail';
import PaymentsList from '@/pages/PaymentsList';
import PaymentDetail from './pages/PaymentDetail';
import VehiclesList from '@/pages/VehiclesList';
import VehicleDetail from '@/pages/VehicleDetail';
import MaintenancesList from './pages/MaintenancesList';
import MaintenanceDetail from './pages/MaintenanceDetail';

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;  