// src/components/Hero/Hero.js
import StravaConnectButton from '../StravaConnectButton/StravaConnectButton';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            Turn Your Miles Into <span className="highlight">Charity Impact</span>
          </h1>
          <p className="hero-description">
            Connect your Strava account and receive donations for every mile you run. 
            Support causes you care about while staying fit and healthy.
          </p>
          <div className="hero-cta">
            <StravaConnectButton />
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">$50K+</span>
              <span className="stat-label">Raised for Charity</span>
            </div>
            <div className="stat">
              <span className="stat-number">2,500+</span>
              <span className="stat-label">Active Runners</span>
            </div>
            <div className="stat">
              <span className="stat-number">15K+</span>
              <span className="stat-label">Miles Logged</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}