// src/app/auth/strava/callback/page.js
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import './callback.css';

export default function StravaCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const scope = searchParams.get('scope');

      // Handle authorization denial
      if (error === 'access_denied') {
        setStatus('denied');
        setError('Authorization was denied. You need to grant access to connect with Strava.');
        return;
      }

      // Handle missing authorization code
      if (!code) {
        setStatus('error');
        setError('No authorization code received from Strava.');
        return;
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('/api/auth/strava/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            scope: scope,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          throw new Error(tokenData.error);
        }

        // Store user data and tokens (you might want to use a more secure storage method)
        const userData = {
          athlete: tokenData.athlete,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_at,
          scope: tokenData.scope,
        };

        // Store in localStorage for demo purposes (use secure storage in production)
        localStorage.setItem('strava_user', JSON.stringify(userData));
        
        setUserInfo(tokenData.athlete);
        setStatus('success');

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);

      } catch (err) {
        console.error('Strava OAuth Error:', err);
        setStatus('error');
        setError(err.message || 'Failed to connect with Strava. Please try again.');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    router.push('/');
  };

  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="callback-content">
            <div className="spinner"></div>
            <h2>Connecting to Strava...</h2>
            <p>Please wait while we complete your authorization.</p>
          </div>
        );

      case 'success':
        return (
          <div className="callback-content success">
            <div className="success-icon">✅</div>
            <h2>Successfully Connected!</h2>
            <p>Welcome to RunForGood, {userInfo?.firstname}!</p>
            <div className="user-info">
              <img 
                src={userInfo?.profile} 
                alt="Profile" 
                className="profile-image"
              />
              <div className="user-details">
                <p><strong>{userInfo?.firstname} {userInfo?.lastname}</strong></p>
                <p>@{userInfo?.username}</p>
                <p>{userInfo?.city}, {userInfo?.country}</p>
              </div>
            </div>
            <p className="redirect-message">Redirecting to your dashboard...</p>
          </div>
        );

      case 'denied':
        return (
          <div className="callback-content error">
            <div className="error-icon">❌</div>
            <h2>Authorization Denied</h2>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-btn">
              Try Again
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="callback-content error">
            <div className="error-icon">⚠️</div>
            <h2>Connection Failed</h2>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-btn">
              Back to Home
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="callback-page">
      <div className="callback-container">
        {renderContent()}
      </div>
    </div>
  );
}