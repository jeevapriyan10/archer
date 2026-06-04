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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    list: {
      flex: 1,
      overflowY: 'auto',
    },
    item: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '12px 24px',
      borderBottom: '1px solid #f0f3f6',
      animation: 'archerSlideIn 0.3s ease-out',
    },
    tickerBadge: {
      fontSize: 12,
      fontWeight: 700,
      color: '#131722',
      flexShrink: 0,
      width: 45,
    },
    headline: {
      fontSize: 13,
      color: '#131722',
      flex: 1,
      lineHeight: 1.4,
    },
    scoreChip: {
      fontSize: 12,
      fontWeight: 600,
      flexShrink: 0,
    },
    time: {
      fontSize: 11,
      color: '#787b86',
      flexShrink: 0,
      textAlign: 'right',
    },
    empty: {
      color: '#787b86',
      fontSize: 13,
      textAlign: 'center',
      padding: 40,
    },
  };

  return (
    <div style={styles.container}>
      <style>{ANIMATION_CSS}</style>

      {/* Header removed for sidebar tab integration */}

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
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ ...styles.scoreChip, color: labelColor }}>
                      {label || (msg.type === 'fraud' ? 'FRAUD' : '---')}
                    </span>
                    <span style={styles.time}>{timeStr}</span>
                  </div>
                  <span style={styles.headline}>{headline}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
