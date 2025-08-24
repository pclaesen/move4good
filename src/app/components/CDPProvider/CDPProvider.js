'use client';

// Simplified CDP Provider - only for UI components, no wallet creation
export default function CDPProvider({ children }) {
  // Since we're doing wallet creation on the backend, we don't need CDP provider for now
  // This can be enabled later if we need CDP UI components
  return children;
}