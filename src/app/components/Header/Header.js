// src/components/Header/Header.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { initiateStravaOAuth } from '@/lib/strava-oauth';
import './Header.css';

export default function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // Check localStorage for Strava user
        const localData = localStorage.getItem('strava_user');
        if (localData) {
          const userData = JSON.parse(localData);
          setIsConnected(userData.connected || false);
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('strava_user');
        setIsConnected(false);
      }
    };

    checkAuthStatus();
    
    // Listen for storage changes (in case user connects/disconnects in another tab)
    const handleStorageChange = () => {
      checkAuthStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
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

 const handleCharitiesClick = (e) => {
    e.preventDefault();
    router.push('/charities');
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
    // Use centralized OAuth utility
    initiateStravaOAuth();
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
              <h1>Move4Good</h1>
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
                href="/charities"
                onClick={handleCharitiesClick}
                className={pathname === '/charities' ? 'active' : ''}
              >
                Charities
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