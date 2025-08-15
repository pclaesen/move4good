// src/components/Hero/Hero.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StravaConnectButton from '../StravaConnectButton/StravaConnectButton';
import './Hero.css';

export default function Hero() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('strava_user');
    if (userData) {
      setIsConnected(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleDashboardClick = () => {
    router.push('/dashboard');
  };

  const handleCharitiesClick = () => {
    router.push('/charities');
  };

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1 className="hero-title">
            Turn Your Miles Into <span className="highlight">Charity Impact</span>
          </h1>
          <p className="hero-description">
            {isConnected 
              ? `Welcome back, ${user?.athlete?.firstname}! Ready to make a difference with your runs?`
              : 'Connect your Strava account and receive donations for every mile you run. Support causes you care about while staying fit and healthy.'
            }
          </p>
          <div className="hero-cta">
            {isConnected ? (
              <div className="connected-actions">
                <button className="dashboard-btn" onClick={handleDashboardClick}>
                  View Dashboard
                </button>
                <button className="charities-btn" onClick={handleCharitiesClick}>
                  Manage Charities
                </button>
              </div>
            ) : (
              <StravaConnectButton />
            )}
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