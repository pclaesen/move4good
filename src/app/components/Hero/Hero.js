// src/components/Hero/Hero.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase-client';
import StravaConnectButton from '../StravaConnectButton/StravaConnectButton';
import './Hero.css';

export default function Hero() {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check Supabase auth first (most reliable)
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (authUser && !error) {
          // User is authenticated, fetch full user data
          const response = await fetch('/api/user');
          if (response.ok) {
            const userData = await response.json();
            setUser({ athlete: userData.athlete || userData });
            setIsConnected(true);
            
            // Update localStorage to keep it in sync
            localStorage.setItem('strava_user', JSON.stringify({
              athlete: userData.athlete || userData,
              connected: true,
              connectedAt: new Date().toISOString()
            }));
            return;
          }
        }
        
        // Fallback to localStorage check
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const parsedData = JSON.parse(localData);
          setUser(parsedData);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        
        // Clear potentially corrupted localStorage
        localStorage.removeItem('strava_user');
        setIsConnected(false);
        setUser(null);
      }
    };

    checkAuthStatus();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkAuthStatus();
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('strava_user');
        setIsConnected(false);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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