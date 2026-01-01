import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import OptimizedDashboard from './OptimizedDashboard';
import Home from './Home';
import Broadcast from './Broadcast';

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home />} />
        {/* Login Page */}
        <Route path="/login" element={<Login />} />
        
        {/* Signup Page */}
        <Route path="/signup" element={<Signup />} />
        
        {/* Dashboard Page - Optimized Version */}
        <Route path="/dashboard" element={<OptimizedDashboard />} />
        
        {/* Old Dashboard (backup) */}
        <Route path="/dashboard-old" element={<Dashboard />} />
        
        {/* Camera Broadcast Page */}
        <Route path="/broadcast" element={<Broadcast />} />
      </Routes>
    </Router>
  );
}

export default App;



