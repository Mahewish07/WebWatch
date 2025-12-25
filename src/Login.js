import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { login } from './api';

function Login() {
  // --- Yahan hum variables bana rahe hain ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // --- YE RAHA WO FUNCTION (Backend se connected) ---
  const handleLogin = async () => {
    // Clear previous errors
    setError("");

    // 1. Check: Empty Email
    if (email === "") {
      setError("Email is required. Please enter your email address.");
      return;
    }

    // 2. Check: Invalid Format
    if (!email.includes("@")) {
      setError("Invalid email format. Please include an '@' symbol.");
      return;
    }

    // 3. Check: Password Length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // 4. Call Backend API
    setLoading(true);
    
    // Backend expects username, so using email as username for now
    // (Backend currently uses hardcoded: username="admin", password="123")
    const result = await login(email, password);
    
    setLoading(false);

    if (result.success) {
      // Success -> Redirect to Dashboard
      // Store login status in localStorage for session management
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', email);
      navigate('/dashboard');
    } else {
      // Show error message
      setError(result.error || "Login failed. Please check your credentials.");
    }
  };
  // -----------------------------------------------------

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="brand">
          <span>⭕</span> WebWatch
        </div>

        <h2>Log in to your account</h2>

        <div className="input-group">
          <input 
            type="email" 
            placeholder="Email (use: admin)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input 
            type="password" 
            placeholder="Password (use: 123)" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Error message display */}
        {error && (
          <div style={{ 
            color: '#ff4444', 
            fontSize: '14px', 
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Info message for testing */}
        <div style={{ 
          color: '#888', 
          fontSize: '12px', 
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          Test credentials: username="admin", password="123"
        </div>

        <div className="forgot-pass">
          Forgot password?
        </div>

        {/* Button dabane par upar wala handleLogin chalega */}
        <button 
          className="login-btn" 
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="signup-text">
          Don't have a account? <Link to="/signup" className="signup-link">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;