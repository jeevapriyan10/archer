/**
 * TickerCard -- Displays a single ticker's sentiment at a glance.
 *
 * Visual encoding: the entire card subtly shifts color temperature based on
 * the sentiment score so operators can scan the row and instantly spot which
 * tickers are trending negative (red glow) vs positive (green glow).
 */

import React from 'react';

// Sentiment label -> badge colour mapping
const LABEL_COLORS = {
  BULLISH: '#089981', // TradingView Green
  BEARISH: '#f23645', // TradingView Red
  NEUTRAL: '#787b86',
};

export default function TickerCard({ ticker }) {
  if (!ticker) return null;

  const score = ticker.last_score || 0;
  const label = (ticker.last_label || 'NEUTRAL').toUpperCase();
  const badgeColor = LABEL_COLORS[label] || LABEL_COLORS.NEUTRAL;

  const lastUpdated = ticker.last_updated
    ? formatRelativeTime(new Date(ticker.last_updated))
    : 'N/A';

  const styles = {
    card: {
      background: '#ffffff',
      border: `1px solid #e0e3eb`,
      borderRadius: 12,
      padding: '16px 20px',
      minWidth: 160,
      maxWidth: 180,
      flexShrink: 0,
      transition: 'box-shadow 0.2s ease',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    symbol: {
      fontWeight: 700,
      fontSize: 16,
      color: '#131722',
      letterSpacing: 0.5,
    },
    badge: {
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 6px',
      borderRadius: 4,
      background: label === 'BULLISH' ? '#e6f5ef' : label === 'BEARISH' ? '#fdedef' : '#f0f3f6',
      color: badgeColor,
    },
    score: {
      fontSize: 24,
      fontWeight: 600,
      color: score > 0 ? '#089981' : score < 0 ? '#f23645' : '#787b86',
      marginBottom: 6,
    },
    meta: {
      fontSize: 12,
      color: '#787b86',
      lineHeight: 1.4,
    },
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.symbol}>{ticker.ticker}</span>
        <span style={styles.badge}>{label}</span>
      </div>
      <div style={styles.score}>
        {score > 0 ? '+' : ''}{score.toFixed(4)}
      </div>
      <div style={styles.meta}>
        {ticker.total_articles || 0} articles | {lastUpdated}
      </div>
    </div>
  );
}

/**
 * Convert a Date to a human-friendly relative string (e.g. "2m ago").
 * Keeps the ticker cards scannable without needing full timestamps.
 */
function formatRelativeTime(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
