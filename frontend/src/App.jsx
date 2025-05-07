// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";

import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import VehiclesList from '@/pages/VehiclesList';
import DriversList from '@/pages/DriversList';
import SchedulesList from '@/pages/SchedulesList';
import PaymentsList from '@/pages/PaymentsList';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import VehicleDetail from '@/pages/VehicleDetail';
import DriverDetail from '@/pages/DriverDetail';

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

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;  