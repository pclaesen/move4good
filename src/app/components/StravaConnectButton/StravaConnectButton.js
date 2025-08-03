// src/components/StravaConnectButton/StravaConnectButton.js
'use client';
import { useState } from 'react';
import './StravaConnectButton.css';

export default function StravaConnectButton() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleStravaConnect = () => {
    setIsConnecting(true);
    
    // Strava OAuth configuration
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || 'your_client_id';
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI || 'http://localhost:3000/auth/strava/callback';
    const scope = 'read,activity:read_all';
    
    // Build Strava authorization URL
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scope}`;
    
    // Redirect to Strava authorization
    window.location.href = stravaAuthUrl;
  };

  return (
    <button 
      className={`strava-connect-btn ${isConnecting ? 'connecting' : ''}`}
      onClick={handleStravaConnect}
      disabled={isConnecting}
    >
      <div className="btn-content">
        <svg className="strava-icon" viewBox="0 0 24 24" width="24" height="24">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172" fill="currentColor"/>
        </svg>
        <span>{isConnecting ? 'Connecting...' : 'Connect with Strava'}</span>
      </div>
    </button>
  );
}