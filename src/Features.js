import React from 'react';
import { Link } from 'react-router-dom';
import './Features.css'; 

const Features = () => {
  return (
    <div className="features-container">
      
      {/* Navbar  */}
      <nav className="navbar">
        <div className="logo">⭕ WebWatch</div>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/login" className="nav-link">Log In</Link>
          <Link to="/signup" className="signup-btn">Sign Up</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="features-content">
        <h2>🔥 Powerful Security Features</h2>
        <p className="subtitle">Everything you need to secure your home, for free.</p>

        <div className="features-grid">
          
          <div className="feature-box">
            <div className="icon">📹</div>
            <h3>Live Streaming</h3>
            <p>Watch HD video from your old phone anywhere in the world with zero latency.</p>
          </div>

          <div className="feature-box">
            <div className="icon">🏃</div>
            <h3>Motion Detection</h3>
            <p>Get instant alerts on your dashboard whenever movement is detected.</p>
          </div>

          <div className="feature-box">
            <div className="icon">☁️</div>
            <h3>Cloud Storage</h3>
            <p>Save important clips securely on the cloud and access them anytime.</p>
          </div>

          <div className="feature-box">
            <div className="icon">📱</div>
            <h3>Multi-Device Support</h3>
            <p>Connect multiple phones as cameras and view them all on one screen.</p>
          </div>

        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <h3>Ready to secure your home?</h3>
          <Link to="/signup" className="cta-btn">Get Started Now</Link>
        </div>

      </div>
    </div>
  );
};

export default Features;