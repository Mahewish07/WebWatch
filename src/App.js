import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';
import Home from './Home';
import Broadcast from './Broadcast';
import Features from './Features';
import LinkCamera from './LinkCamera';

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
        
        {/* Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Camera Broadcast Page */}
        <Route path="/broadcast" element={<Broadcast />} />

        {/* Features */}
        <Route path="/features" element={<Features />} />

        {/*Link Camera*/}
        <Route path="/link-camera" element={<LinkCamera />} />
      </Routes>
    </Router>
  );
}

export default App;



