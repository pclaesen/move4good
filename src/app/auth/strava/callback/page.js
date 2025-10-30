// src/app/auth/strava/callback/page.js
'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import './callback.css';

function StravaCallbackComponent() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const scope = searchParams.get('scope');

      // Handle authorization denial
      if (errorParam === 'access_denied') {
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

        let tokenData;
        try {
          tokenData = await tokenResponse.json();
        } catch (jsonErr) {
          console.error('Failed to parse JSON from token endpoint:', jsonErr);
          throw new Error(`Token endpoint returned invalid JSON (status ${tokenResponse.status})`);
        }

        if (!tokenResponse.ok) {
          console.error('Token exchange failed:', tokenData);
          throw new Error(
            `Token exchange failed (status ${tokenResponse.status}): ${
              tokenData?.error || tokenData?.details || JSON.stringify(tokenData)
            }`
          );
        }

        if (tokenData.error) {
          throw new Error(tokenData.error);
        }

        if (!tokenData.success || !tokenData.redirectUrl) {
          throw new Error('Invalid response from token exchange');
        }

        setUserInfo(tokenData.athlete);

        // Establish Supabase session using the tokens from the API
        if (tokenData.sessionTokens?.access_token && tokenData.sessionTokens?.refresh_token) {
          const supabase = createClient();

          // Set the session using the tokens returned from server
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: tokenData.sessionTokens.access_token,
            refresh_token: tokenData.sessionTokens.refresh_token,
          });

          if (sessionError) {
            console.error('Failed to establish session:', sessionError);
            throw new Error(`Failed to create session: ${sessionError.message}`);
          }

          console.log('Session established successfully:', sessionData);
        } else {
          console.warn('No session tokens provided, user may need to reconnect');
        }

        setStatus('success');

        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
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
            <p>Welcome to Move4Good, {userInfo?.firstname}!</p>
            <div className="user-info">
              <img src={userInfo?.profile} alt="Profile" className="profile-image" />
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
      case 'error':
        return (
          <div className="callback-content error">
            <div className="error-icon">⚠️</div>
            <h2>{status === 'denied' ? 'Authorization Denied' : 'Connection Failed'}</h2>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-btn">
              {status === 'denied' ? 'Try Again' : 'Back to Home'}
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

export default function StravaCallback() {
  return (
    <Suspense fallback={
      <div className="callback-page">
        <div className="callback-container">
          <div className="callback-content">
            <div className="spinner"></div>
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <StravaCallbackComponent />
    </Suspense>
  );
}
