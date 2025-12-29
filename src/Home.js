import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
    return (
        <div className="home-bg">
            <div className="container">
                {/* Header */}
                <header>
                    <div className="logo">
                        <svg viewBox="0 0 512 512"><path d="M222.7 32.1c5 16.9-4.6 34.8-21.5 39.8C121.8 95.6 64 169.1 64 256c0 106 86 192 192 192s192-86 192-192c0-86.9-57.8-160.4-137.1-184.1c-16.9-5-26.6-22.9-21.5-39.8s22.9-26.6 39.8-21.5C434.9 42.1 512 140 512 256c0 141.4-114.6 256-256 256S0 397.4 0 256C0 140 77.1 42.1 182.9 10.6c16.9-5 34.8 4.6 39.8 21.5z" /></svg>
                        WebWatch
                    </div>
                    <nav>
                        <ul>
                            <li><Link to="/features">Features</Link></li>
                            {/* Login Page Link */}
                            <li><Link to="/login">Log In</Link></li>
                            <li><Link to="/signup" className="btn-signup">Sign Up</Link></li>
                        </ul>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="hero">
                    <div className="hero-text">
                        <h1>Turn any old device into a web-based security camera</h1>
                        <p>No apps to install. 100% in your browser.</p>
                        <p className="sub-note">Free for your first 3 cameras</p>

                        {/* Main Button */}
                        <Link to="/broadcast">
                            <button className="btn-primary">Switch To Camera Mode</button>
                        </Link>
                    </div>

                    {/* Illustration */}
                    <div className="hero-image">
                        <div className="illustration-container">
                            <div className="phone">
                                <svg viewBox="0 0 640 512"><path d="M308.5 135.3c7.1-6.3 9.9-16.2 6.2-25c-2.3-5.3-4.8-10.5-7.6-15.5C246.4 17.2 147.3 3.9 66.8 54.7l-4.2 2.7C29.1 78.5 6.9 115.6 1.3 154.5c-2.2 15.6 8.3 29.9 23.9 32.5s30.9-9 34.7-24.5c3.5-14.3 12.5-27.1 24.9-34.9l4.5-2.8c42-26.5 90.7-33 138-18.4c3.4 1.1 6.8 2.3 10.2 3.5c8.6 3.1 18.2 1.6 25.4-4.2l45.7-36.6zM286.3 297c-5.9-10.4-17.7-16-29.2-13.6c-4.4 .9-8.7 2.1-13 3.4c-26.6 8.2-51.5 24.8-71.2 47.5c-11.6 13.3-10.7 33.3 1.9 45.6s32.7 13.1 44.9 .9c11.6-11.6 26.3-20.7 42.6-25.7c4-1.2 8-2.3 12.1-3.1c11.9-2.5 21.6-10.9 25.1-22.6s-1.1-24.1-10-31.4L286.3 297zM160 384c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zM480 32c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zm64 96c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zM512 256c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zm96-96c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32z" /></svg>
                                <svg viewBox="0 0 512 512"><path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z" /></svg>
                            </div>
                            <div className="browser">
                                <div className="browser-header">
                                    <div className="dot red"></div>
                                    <div className="dot yellow"></div>
                                    <div className="dot green"></div>
                                </div>
                                <div className="video-grid">
                                    <div className="video-box"><svg viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 296c14.3-8.7 23-24.2 23-41.6s-8.7-32.9-23-41.6L73 39z" /></svg></div>
                                    <div className="video-box"><svg viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 296c14.3-8.7 23-24.2 23-41.6s-8.7-32.9-23-41.6L73 39z" /></svg></div>
                                    <div className="video-box"><svg viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 296c14.3-8.7 23-24.2 23-41.6s-8.7-32.9-23-41.6L73 39z" /></svg></div>
                                    <div className="video-box"><svg viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 296c14.3-8.7 23-24.2 23-41.6s-8.7-32.9-23-41.6L73 39z" /></svg></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="how-it-works">
                    <div className="section-title">How it Works</div>
                    <div className="steps-container">
                        <div className="step">
                            <div className="step-icon-wrapper">
                                <svg className="main-icon" viewBox="0 0 448 512"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" /></svg>
                                <svg className="check-badge" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" /></svg>
                            </div>
                            <p>1. Sign up for a free account</p>
                        </div>
                        <div className="step">
                            <div className="step-icon-wrapper">
                                <svg className="main-icon" viewBox="0 0 384 512"><path d="M80 0C44.7 0 16 28.7 16 64V448c0 35.3 28.7 64 64 64H304c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H80zM192 400a48 48 0 1 0 0 96 48 48 0 1 0 0-96z" /></svg>
                                <svg className="check-badge" style={{ fill: "white" }} viewBox="0 0 448 512"><path d="M0 80C0 53.5 21.5 32 48 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V80zM64 96v64h64V96H64zM0 336c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V336zM64 352v64h64V352H64zM304 32h96c26.5 0 48 21.5 48 48v96c0 26.5-21.5 48-48 48H304c-26.5 0-48-21.5-48-48V80zM368 96v64h64V96H368z" /></svg>
                            </div>
                            <p>2. Open 'webwatch.com' on old phone</p>
                        </div>
                        <div className="step">
                            <div className="step-icon-wrapper">
                                <svg className="main-icon" viewBox="0 0 640 512"><path d="M128 32C92.7 32 64 60.7 64 96V352h64V96H512V352h64V96c0-35.3-28.7-64-64-64H128zM19.2 384C8.6 384 0 392.6 0 403.2C0 445.6 34.4 480 76.8 480H563.2c42.4 0 76.8-34.4 76.8-76.8c0-10.6-8.6-19.2-19.2-19.2H19.2z" /></svg>
                                <svg className="check-badge" style={{ fill: "#5d5dff", background: "white" }} viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 296c14.3-8.7 23-24.2 23-41.6s-8.7-32.9-23-41.6L73 39z" /></svg>
                            </div>
                            <p>3. Watch live stream instantly</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Home;