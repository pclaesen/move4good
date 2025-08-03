// src/components/Header/Header.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import './Header.css';

export default function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is connected to Strava
    const checkConnection = () => {
      const userData = localStorage.getItem('strava_user');
      setIsConnected(!!userData);
    };

    checkConnection();
    
    // Listen for storage changes (in case user connects/disconnects in another tab)
    window.addEventListener('storage', checkConnection);
    
    // Also check on focus (in case storage event doesn't fire)
    window.addEventListener('focus', checkConnection);
    
    return () => {
      window.removeEventListener('storage', checkConnection);
      window.removeEventListener('focus', checkConnection);
    };
  }, []);

  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (isConnected) {
      router.push('/dashboard');
    } else {
      setShowConnectModal(true);
    }
  };

  const handleNavClick = (e, target) => {
    e.preventDefault();
    if (pathname !== '/') {
      // If not on homepage, navigate to homepage first, then scroll to section
      router.push(`/${target}`);
    } else {
      // If on homepage, just scroll to section
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleStravaConnect = () => {
    // Using the same OAuth configuration from StravaConnectButton
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || 'your_client_id';
    const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI || 'http://localhost:3000/auth/strava/callback';
    const scope = 'read,activity:read_all';
    
    // Build Strava authorization URL
    const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${scope}`;
    
    // Redirect to Strava authorization
    window.location.href = stravaAuthUrl;
  };

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setShowConnectModal(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">
              <h1>RunForGood</h1>
            </div>
            <nav className="nav">
              <a 
                href="#features" 
                onClick={(e) => handleNavClick(e, '#features')}
              >
                How it Works
              </a>
              <a 
                href="#about" 
                onClick={(e) => handleNavClick(e, '#about')}
              >
                About
              </a>
              <a 
                href="/dashboard" 
                onClick={handleDashboardClick}
                className={pathname === '/dashboard' ? 'active' : ''}
              >
                Dashboard
              </a>
              <a 
                href="#contact" 
                onClick={(e) => handleNavClick(e, '#contact')}
              >
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Connect to Strava Modal */}
      {showConnectModal && (
        <div className="connect-modal-overlay" onClick={closeModal}>
          <div className="connect-modal">
            <button 
              className="close-btn" 
              onClick={() => setShowConnectModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="modal-content">
              <h2>Connect to Strava First</h2>
              <p>To access your dashboard and track your runs for good causes, you need to connect your Strava account.</p>
              <button 
                className="strava-connect-btn"
                onClick={handleStravaConnect}
              >
                <div className="btn-content">
                  <svg className="strava-icon" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.172" fill="currentColor"/>
                  </svg>
                  <span>Connect with Strava</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}