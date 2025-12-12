import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  // --- ACTUAL LOGIC: Shuruaat mein list KHALI hai ---
  const [cameras, setCameras] = useState([]);

  // Logout Function
  const handleLogout = () => {
    navigate('/login');
  };

  // --- ADD CAMERA FUNCTION ---
  // Jab button dabega, tabhi naya camera list mein judega
  const handleAddCamera = () => {
    // Ye code naya camera banata hai
    const newCamera = {
      id: Date.now(), // Unique ID (Time ke hisaab se)
      name: `Camera ${cameras.length + 1}`, // Camera 1, Camera 2...
      status: "Live"
    };

    // Purani list mein naya camera jod do
    setCameras([...cameras, newCamera]);
  };

  return (
    <div className="dashboard-container">
      
      {/* --- SIDEBAR --- */}
      <div className="sidebar">
        <div className="brand">⭕ WebWatch</div>
        <ul className="menu">
          <li className="active">📷 My Cameras</li>
          <li>📼 Recordings</li>
          <li>⚙️ Settings</li>
        </ul>
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="main-content">
        <div className="header">
          <h2>My Cameras</h2>
          <button className="add-btn" onClick={handleAddCamera}>
            + Add New Camera
          </button>
        </div>

        {/* --- CAMERA GRID --- */}
        <div className="camera-grid">
          
          {/* Agar list khali hai (0 cameras), to ye message dikhao */}
          {cameras.length === 0 ? (
            <div className="no-camera">
              <p>No cameras found. Click the button above to add one!</p>
            </div>
          ) : (
            // Agar cameras hain, to unhe dikhao
            cameras.map((cam) => (
              <div key={cam.id} className="camera-card">
                <div className="video-placeholder">
                  <span>📹 Video Feed: {cam.name}</span>
                </div>
                
                <div className="card-info">
                  <h3>{cam.name}</h3>
                  
                  {/* Ye line ab fixed hai (Backticks ` ` ke saath) */}
                  <span className={`status ${cam.status.toLowerCase()}`}>
                    ● {cam.status}
                  </span>
                  
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;