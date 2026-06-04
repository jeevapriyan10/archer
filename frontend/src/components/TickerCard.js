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
  BULLISH: '#00e676',
  BEARISH: '#ff1744',
  NEUTRAL: '#78909c',
};

export default function TickerCard({ ticker }) {
  if (!ticker) return null;

  const score = ticker.last_score || 0;
  const label = (ticker.last_label || 'NEUTRAL').toUpperCase();
  const badgeColor = LABEL_COLORS[label] || LABEL_COLORS.NEUTRAL;

  // Compute how long ago the last update was for relative time display
  const lastUpdated = ticker.last_updated
    ? formatRelativeTime(new Date(ticker.last_updated))
    : 'N/A';

  // Score determines the glow colour: green for positive, red for negative
  const glowColor = score > 0
    ? `rgba(0, 230, 118, ${Math.min(Math.abs(score) * 0.4, 0.35)})`
    : score < 0
      ? `rgba(255, 23, 68, ${Math.min(Math.abs(score) * 0.4, 0.35)})`
      : 'rgba(120, 144, 156, 0.08)';

  const styles = {
    card: {
      background: '#12121a',
      border: `1px solid ${score > 0 ? 'rgba(0,230,118,0.2)' : score < 0 ? 'rgba(255,23,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 16,
      padding: '20px 22px',
      minWidth: 180,
      maxWidth: 200,
      flexShrink: 0,
      boxShadow: `0 0 20px ${glowColor}`,
      transition: 'all 0.4s ease',
      cursor: 'default',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    symbol: {
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700,
      fontSize: 20,
      color: '#fff',
      letterSpacing: 1,
    },
    badge: {
      fontSize: 10,
      fontWeight: 600,
      padding: '3px 8px',
      borderRadius: 6,
      background: `${badgeColor}22`,
      color: badgeColor,
      letterSpacing: 0.5,
    },
    score: {
      fontSize: 32,
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      color: score > 0 ? '#00e676' : score < 0 ? '#ff1744' : '#78909c',
      transition: 'color 0.5s ease',
      marginBottom: 8,
    },
    meta: {
      fontSize: 11,
      color: '#666',
      lineHeight: 1.6,
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
