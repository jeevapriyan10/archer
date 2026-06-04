/**
 * Archer -- API Client
 *
 * Centralized axios instance for all REST calls to the FastAPI backend.
 * Every function swallows errors and returns an empty array so the UI
 * never crashes from a failed network request.
 */

import axios from 'axios';

// Use env var in Docker / CRA, fall back to localhost for local dev
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

export async function fetchTickers() {
  try {
    const res = await api.get('/tickers');
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchRecentSentiment(limit = 50) {
  try {
    const res = await api.get(`/sentiment/recent?limit=${limit}`);
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchFraudRisk() {
  try {
    const res = await api.get('/fraud/risk');
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchFlaggedTransactions() {
  try {
    const res = await api.get('/fraud/flagged');
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchTickerSentiment(ticker, limit = 20) {
  try {
    const res = await api.get(`/sentiment/${ticker}?limit=${limit}`);
    return res.data;
  } catch {
    return [];
  }
}

export default api;
