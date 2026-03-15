import React from 'react';
import './TokenDisplay.css';

const TokenDisplay = ({ token }) => {
  if (!token) {
    return null;
  }

  return (
    <div className="token-container">
      <strong>Tu Token (Cópialo):</strong>
      <p className="token-text">{token}</p>
    </div>
  );
};

export default TokenDisplay;
