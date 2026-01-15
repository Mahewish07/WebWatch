import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config';
import './Login.css';

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // --- SIGN UP LOGIC (Backend Integration) ---
  const handleSignup = async () => {
    setError("");
    
    // 1. Validation
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 3) {
      setError("Password must be at least 3 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // 2. Send to Backend
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.status === 'ok') {
        alert("✅ Account created successfully! Please login.");
        navigate('/login');
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Connection error. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="brand">
          <span>⭕</span> WebWatch
        </div>

        <h2>Create New Account</h2>

        {error && (
          <div style={{
            color: '#ff4444',
            background: 'rgba(255, 68, 68, 0.1)',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div className="input-group">
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button 
          className="login-btn" 
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="signup-text">
          Already have an account? <Link to="/login" className="signup-link">Log In</Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;