/**
 * LiveFeed -- Real-time scrolling feed of sentiment events.
 *
 * New items slide in from the top with a CSS animation. Heartbeats and
 * connection messages are filtered out so operators only see actionable
 * sentiment data.
 */

import React from 'react';

const LABEL_COLORS = {
  BULLISH: '#00e676',
  BEARISH: '#ff1744',
  NEUTRAL: '#78909c',
};

// CSS keyframe for slide-in animation injected once on first render
const ANIMATION_CSS = `
@keyframes archerSlideIn {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

export default function LiveFeed({ messages, connected }) {
  // Filter out non-data messages (heartbeats, connection acks)
  const feedItems = (messages || []).filter(
    (m) => m.type !== 'heartbeat' && m.type !== 'connected'
  );

  const styles = {
    container: {
      background: '#12121a',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 20,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: 600,
      color: '#fff',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: connected ? '#00e676' : '#ff1744',
      boxShadow: connected
        ? '0 0 8px rgba(0,230,118,0.6)'
        : '0 0 8px rgba(255,23,68,0.6)',
      display: 'inline-block',
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      color: connected ? '#00e676' : '#ff1744',
    },
    list: {
      flex: 1,
      overflowY: 'auto',
      maxHeight: 400,
      paddingRight: 4,
    },
    item: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      animation: 'archerSlideIn 0.3s ease-out',
    },
    tickerBadge: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      flexShrink: 0,
      minWidth: 50,
      textAlign: 'center',
    },
    headline: {
      fontSize: 13,
      color: '#b0b0c0',
      flex: 1,
      lineHeight: 1.4,
    },
    scoreChip: {
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace",
      flexShrink: 0,
    },
    time: {
      fontSize: 10,
      color: '#555',
      flexShrink: 0,
      minWidth: 50,
      textAlign: 'right',
    },
    empty: {
      color: '#555',
      fontSize: 13,
      textAlign: 'center',
      padding: 40,
    },
  };

  return (
    <div style={styles.container}>
      <style>{ANIMATION_CSS}</style>

      <div style={styles.header}>
        <span style={styles.title}>Live Feed</span>
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <span style={styles.statusDot} />
          <span style={styles.statusText}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </span>
      </div>

      <div style={styles.list}>
        {feedItems.length === 0 ? (
          <div style={styles.empty}>Waiting for data...</div>
        ) : (
          feedItems.map((msg, i) => {
            const data = msg.data || {};
            const label = (data.sentiment_label || data.risk_level || '').toUpperCase();
            const labelColor = LABEL_COLORS[label] || '#78909c';
            const score = data.sentiment_score ?? data.fraud_risk_score ?? 0;
            const headline = data.headline
              ? data.headline.length > 80
                ? data.headline.slice(0, 80) + '...'
                : data.headline
              : (msg.type === 'fraud' ? `Fraud alert: ${data.ticker}` : 'N/A');
            const time = data.processed_at || data.assessed_at || '';
            const timeStr = time
              ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div key={i} style={styles.item}>
                <span style={styles.tickerBadge}>
                  {data.ticker || '---'}
                </span>
                <span style={{ ...styles.scoreChip, color: labelColor }}>
                  {label || (msg.type === 'fraud' ? 'FRAUD' : '---')}
                </span>
                <span style={styles.headline}>{headline}</span>
                <span style={{ ...styles.scoreChip, color: score > 0 ? '#00e676' : score < 0 ? '#ff1744' : '#78909c' }}>
                  {score > 0 ? '+' : ''}{Number(score).toFixed(2)}
                </span>
                <span style={styles.time}>{timeStr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
