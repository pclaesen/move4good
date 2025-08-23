'use client';
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { generatePaymentURI, SPONSORSHIP_CONFIG } from '../../../lib/chain-config';
import './QRCodePopup.css';

const TRANSACTION_STATES = {
  IDLE: 'idle',
  SCANNING: 'scanning', 
  MONITORING: 'monitoring',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export default function QRCodePopup({ isOpen, onClose, walletAddress, charityName }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [transactionState, setTransactionState] = useState(TRANSACTION_STATES.IDLE);
  const popupRef = useRef(null);
  const pollingRef = useRef(null);
  const startTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && walletAddress) {
      const paymentURI = generatePaymentURI(walletAddress);
      
      QRCode.toDataURL(paymentURI, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then(url => {
        setQrCodeUrl(url);
        
        // Start monitoring automatically 4 seconds after QR code is generated
        startTimeoutRef.current = setTimeout(() => {
          startMonitoring();
        }, 4000);
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
    
    // Reset state when popup opens
    if (isOpen) {
      setTransactionState(TRANSACTION_STATES.IDLE);
    }
  }, [isOpen, walletAddress]);

  const startMonitoring = () => {
    if (!walletAddress) return;
    
    setTransactionState(TRANSACTION_STATES.MONITORING);
    
    const pollForTransaction = async () => {
      try {
        const response = await fetch(`/api/monitor-transaction?charityAddress=${walletAddress}`);
        const data = await response.json();
        
        if (data.found && data.transaction) {
          setTransactionState(TRANSACTION_STATES.COMPLETED);
          
          // Auto-close after showing success for 3 seconds
          setTimeout(() => {
            onClose();
          }, 3000);
          
          // Clear polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        } else if (data.error) {
          console.error('Transaction monitoring error:', data.error);
          setTransactionState(TRANSACTION_STATES.FAILED);
        }
      } catch (error) {
        console.error('Error polling for transaction:', error);
        setTransactionState(TRANSACTION_STATES.FAILED);
      }
    };
    
    // Poll every 10 seconds
    pollingRef.current = setInterval(pollForTransaction, 10000);
    
    // Initial check
    pollForTransaction();
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      
      // Clear polling and timeout when component unmounts or popup closes
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="qr-popup-overlay">
      <div className="qr-popup" ref={popupRef}>
        <div className="qr-popup-header">
          <h3>Sponsor {charityName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="qr-popup-content">
          {transactionState === TRANSACTION_STATES.COMPLETED ? (
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Payment Received!</h3>
              <p>Thank you for sponsoring {charityName}!</p>
              <p>Your 0.5 USDC donation has been confirmed on the blockchain.</p>
            </div>
          ) : (
            <>
              <div className="qr-code-container">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code for payment" className="qr-code" />
                ) : (
                  <div className="qr-loading">Generating QR code...</div>
                )}
              </div>
              
              <div className="payment-details">
                <div className="amount">
                  <span className="amount-value">{SPONSORSHIP_CONFIG.fixedAmount.USDC} USDC</span>
                  <span className="amount-label">Fixed sponsorship amount</span>
                </div>
                
                <div className="network-info">
                  <span className="network-name">Base Sepolia</span>
                  <span className="network-label">Test Network</span>
                </div>
              </div>
              
              {transactionState === TRANSACTION_STATES.MONITORING ? (
                <div className="monitoring-state-inline">
                  <div className="loading-spinner"></div>
                  <h4>Waiting for Payment</h4>
                  <p>Monitoring the blockchain for your 5 USDC transaction.</p>
                  <p className="monitoring-note">This popup will close automatically when payment is confirmed.</p>
                </div>
              ) : (
                <div className="instructions">
                  <h4>How to sponsor:</h4>
                  <ol>
                    <li>Open your crypto wallet app (MetaMask, Coinbase Wallet, etc.)</li>
                    <li>Scan this QR code with your wallet</li>
                    <li>Confirm the transaction details</li>
                    <li>Complete the payment</li>
                  </ol>
                  <p className="note">
                    Make sure you're connected to Base Sepolia network in your wallet.
                  </p>
                  
                  <div className="auto-monitor-info">
                    <p>💫 Monitoring will start automatically in a few seconds...</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}