import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  // --- Yahan hum variables bana rahe hain ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // --- YE RAHA WO FUNCTION (Jise tum dhoondh rahe ho) ---
  const handleLogin = () => {
    // 1. Check: Empty Email
    if (email === "") {
      alert("Email is required. Please enter your email address.");
      return;
    }

    // 2. Check: Invalid Format
    if (!email.includes("@")) {
      alert("Invalid email format. Please include an '@' symbol.");
      return;
    }

    // 3. Check: Password Length
    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    // 4. Success -> Redirect to Dashboard
    navigate('/dashboard'); 
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
            placeholder="Email" 
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="forgot-pass">
          Forgot password?
        </div>

        {/* Button dabane par upar wala handleLogin chalega */}
        <button className="login-btn" onClick={handleLogin}>
          Login
        </button>

        <p className="signup-text">
          Don't have a account? <Link to="/signup" className="signup-link">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;