import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css'; // Magic Line: Purana design reuse kar rahe hain! 😎

function Broadcast() {
  const [enteredCode, setEnteredCode] = useState("");

  const handleStartStream = () => {
    if (enteredCode.length >= 6) {
      alert(`Connecting to Dashboard with code: ${enteredCode}`);
    } else {
      alert("Please enter a valid 6-digit code.");
    }
  };

  return (
    // 'login-container' use kiya taaki background dark blue ho jaye
    <div className="login-container">
      
      {/* 'login-card' use kiya taaki beech wala glowing box aa jaye */}
      <div className="login-card">
        
        {/* Brand Logo */}
        <div className="brand">
          <span>⭕</span> WebWatch
        </div>

        <h2>Link This Device</h2>

        <div className="input-group">
          <input 
            type="text" 
            placeholder="Enter Link Code" 
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
            maxLength="6"
            // Thoda sa custom style taaki code bada aur center mein dikhe
            style={{ textAlign: 'center', letterSpacing: '5px', fontSize: '20px', fontWeight: 'bold' }}
          />
        </div>

        {/* Wahi Blue Button design */}
        <button className="login-btn" onClick={handleStartStream}>
          Start Streaming
        </button>

        {/* Wapas jaane ka raasta */}
        <p className="signup-text">
          <Link to="/" className="signup-link">Cancel & Go Back</Link>
        </p>

      </div>
    </div>
  );
}

export default Broadcast;