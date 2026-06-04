/**
 * SentimentChart -- Interactive line chart for per-ticker sentiment history.
 *
 * Uses Recharts to plot sentiment_score (-1 to +1) over time.
 * A dropdown lets users switch between the 8 monitored tickers.
 * The line color shifts based on the most recent score value.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts';
import { fetchTickerSentiment } from '../api';

const TICKERS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'JPM'];

export default function SentimentChart() {
  const [ticker, setTicker] = useState('AAPL');
  const [data, setData] = useState([]);

  const loadData = useCallback(async () => {
    const raw = await fetchTickerSentiment(ticker, 20);
    // Reverse so chart reads left-to-right chronologically
    const chartData = [...raw].reverse().map((item) => ({
      time: item.processed_at
        ? new Date(item.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      score: item.sentiment_score || 0,
      headline: item.headline || '',
    }));
    setData(chartData);
  }, [ticker]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine line color from the most recent data point
  const lastScore = data.length > 0 ? data[data.length - 1].score : 0;
  const lineColor = lastScore > 0 ? '#00e676' : lastScore < 0 ? '#ff1744' : '#78909c';

  const styles = {
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
    },
    header: {
      display: 'none',
    },
    title: {
      fontSize: 18,
      fontWeight: 600,
      color: '#131722',
    },
    select: {
      background: '#f0f3f6',
      border: 'none',
      borderRadius: 6,
      color: '#131722',
      padding: '6px 12px',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      outline: 'none',
    },
    empty: {
      color: '#787b86',
      fontSize: 14,
      textAlign: 'center',
      padding: 40,
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  // Custom tooltip that shows the full headline on hover
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e0e3eb',
        borderRadius: 8,
        padding: '12px 16px',
        maxWidth: 300,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: 13, color: '#131722', fontWeight: 600, marginBottom: 4 }}>
          Score: {item.score > 0 ? '+' : ''}{item.score.toFixed(4)}
        </div>
        <div style={{ fontSize: 12, color: '#787b86', lineHeight: 1.4 }}>
          {item.headline}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header handled by App.js layout, we just put select dropdown here if needed, or remove it. Let's keep select for changing ticker */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <select
          style={styles.select}
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
        >
          {['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'JPM'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {data.length === 0 ? (
        <div style={styles.empty}>No sentiment data for {ticker}</div>
      ) : (
        <div style={{ flex: 1, minHeight: 250 }}>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e3eb" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#787b86', fontSize: 11 }}
                axisLine={{ stroke: '#e0e3eb' }}
                tickLine={false}
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fill: '#787b86', fontSize: 11 }}
                axisLine={{ stroke: '#e0e3eb' }}
                tickLine={false}
                tickFormatter={(v) => v.toFixed(1)}
              />
              <ReferenceLine y={0} stroke="#b2b5be" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
