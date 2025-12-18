import React, { useState } from 'react';
import './LinkCamera.css'; // Styling ke liye

const LinkCamera = () => {
  const [cameraCode, setCameraCode] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Linking...');

    try {
      // Backend (Node.js) ko data bhejna
      const response = await fetch('http://localhost:5000/api/add-camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cameraCode }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('✅ Camera Linked Successfully!');
      } else {
        setStatus('❌ Error: ' + data.message);
      }
    } catch (error) {
      setStatus('❌ Connection Failed!');
    }
  };

  return (
    <div className="link-container">
      <div className="link-card">
        <h2>Link New Camera</h2>
        <p>Enter the code from your old device</p>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="XXXX-XXXX" 
            value={cameraCode}
            onChange={(e) => setCameraCode(e.target.value)}
            required 
          />
          <button type="submit" className="blue-btn">Connect Device</button>
        </form>
        <p className="status-msg">{status}</p>
      </div>
    </div>
  );
};

export default LinkCamera;