import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from './config'; 
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Token save kar rahe hain taaki 'Add Camera' chal sake
        localStorage.setItem('token', data.access_token || data.token);
        if(data.user) localStorage.setItem('user', JSON.stringify(data.user));
        
        navigate('/dashboard');
      } else {
        setError(data.error || "Invalid Credentials");
      }
    } catch (err) {
      console.error(err);
      setError("Connection Failed. Check if Backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand">⭕ WebWatch</div>
        <h2>Log in to your account</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
              name="username" 
              placeholder="Username" 
              value={formData.username} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              name="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>

          {/* 👇 YE RAHA WO DESIGN JO AAPKO CHAHIYE THA */}
          <div style={{margin: '10px 0', fontSize: '13px', color: '#88909c', textAlign: 'center'}}>
             Test credentials: username="<b>admin</b>", password="<b>123</b>"
          </div>

          {error && <p className="error-msg" style={{color: '#ef4444', textAlign: 'center'}}>{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="signup-text">
          Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;