import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Wahi same design use kar rahe hain

function Signup() {
  // --- Variables (State) ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Navigation hook (Page badalne ke liye)
  const navigate = useNavigate();

  // --- SIGN UP LOGIC (Validation) ---
  const handleSignup = () => {
    // 1. Check: Empty Name
    if (name === "") {
      alert("Full Name is required. Please enter your name.");
      return;
    }

    // 2. Check: Empty Email OR Invalid Format
    if (email === "" || !email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    // 3. Check: Password Strength
    if (password.length < 6) {
      alert("Password is too short. It must be at least 6 characters long.");
      return;
    }

    // 4. Success -> Welcome Message & Redirect
    alert("Account created successfully! Welcome, " + name + ".");
    // Mark as logged in
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', name);
    navigate('/dashboard');
  };
  // ------------------------------------

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* Brand Logo */}
        <div className="brand">
          <span>⭕</span> WebWatch
        </div>

        <h2>Create a new account</h2>

        <div className="input-group">
          {/* Full Name Input */}
          <input 
            type="text" 
            placeholder="Full Name" 
            onChange={(e) => setName(e.target.value)}
          />
          
          {/* Email Input */}
          <input 
            type="email" 
            placeholder="Email" 
            onChange={(e) => setEmail(e.target.value)}
          />
          
          {/* Password Input */}
          <input 
            type="password" 
            placeholder="Password" 
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Button dabane par handleSignup chalega */}
        <button className="login-btn" onClick={handleSignup}>
          Sign Up
        </button>

        <p className="signup-text">
          Already have an account? <Link to="/login" className="signup-link">Log In</Link>
        </p>

      </div>
    </div>
  );
}

export default Signup;