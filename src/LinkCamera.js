import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config'; 
import './LinkCamera.css';

function LinkCamera() {
  const navigate = useNavigate();
  const [code, setCode] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Token check karo
    const token = localStorage.getItem('token'); 

    if (!token) {
        setError("You are not logged in! Please Login again.");
        // Agar login nahi hai to wapis bhej do
        setTimeout(() => navigate('/login'), 2000);
        return;
    }

    // 2. Token ke sath request bhejo
    fetch(API_ENDPOINTS.GENERATE_CODE, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 👈 Ye line error hata degi
        }
    })
      .then((res) => {
         if(!res.ok) throw new Error("Failed to fetch code");
         return res.json();
      })
      .then((data) => {
        if (data.code) {
          setCode(data.code);
        } else {
          setError(data.msg || "Failed to generate code");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Backend Error! Check Console.");
      });
  }, []);

  return (
    <div className="link-camera-container">
      <div className="link-card">
        <div className="icon-wrapper">🔗</div>
        <h2>Connect New Camera</h2>
        
        <div className="code-display">
            {error ? (
                <h3 style={{color:'red'}}>{error}</h3>
            ) : (
                <h1>{code}</h1>
            )}
        </div>
        
        <p style={{color: '#aaa', margin: '20px 0'}}>
            Enter this code on your phone in Broadcast Mode.
        </p>

        <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default LinkCamera;