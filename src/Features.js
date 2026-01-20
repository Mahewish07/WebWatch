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
        <p className="subtitle">Everything you need to secure your home, using hardware you already own.</p>

        <div className="features-grid">

          {/* Feature 1: Live Streaming (Correct) */}
          <div className="feature-box">
            <div className="icon">📹</div>
            <h3>Live Streaming</h3>
            <p>Watch HD video from your old phone anywhere in your local network with zero latency.</p>
          </div>

          {/* Feature 2: CHANGED to Instant Recording */}
          <div className="feature-box">
            <div className="icon">🔴</div>
            <h3>Instant Recording</h3>
            <p>Capture important moments with a single click. Save video clips directly to your central hub.</p>
          </div>

          {/* Feature 3: CHANGED to Private Local Storage */}
          <div className="feature-box">
            <div className="icon">🔒</div>
            <h3>Private Local Storage</h3>
            <p>Your data stays in your home. Recordings are stored securely on your laptop, not the public cloud.</p>
          </div>

          {/* Feature 4: Multi-Device (Correct) */}
          <div className="feature-box">
            <div className="icon">📱</div>
            <h3>Multi-Device Support</h3>
            <p>Connect multiple phones as cameras and control them all from one central dashboard.</p>
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