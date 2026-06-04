# ARCHER -- Real-Time Financial Sentiment & Fraud Risk Engine

> An end-to-end ML-powered fintech pipeline that streams synthetic financial news through Kafka, classifies sentiment with FinBERT, detects fraud patterns via a multi-signal correlation engine, and displays everything on a live React dashboard.

---

## Architecture

```
+------------------+       +------------------+       +---------------------+
|                  |       |                  |       |                     |
|  News Producer   +------>+      Kafka       +------>+  FinBERT Consumer   |
|  (Python)        |       |  (raw-news)      |       |  (transformers)     |
|                  |       |                  |       |                     |
+------------------+       +------------------+       +----------+----------+
                                                                 |
                                                                 | save
                                                                 v
+------------------+       +------------------+       +---------------------+
|                  |       |                  |       |                     |
|  React Dashboard +<------+  FastAPI + WS    +<------+    PostgreSQL       |
|  (port 3000)     |       |  (port 8000)     |       |    (archerdb)       |
|                  |       |                  |       |                     |
+------------------+       +------------------+       +----------+----------+
                                    ^                            |
                                    |   push alerts              | query
                                    |                            v
                            +------------------+      +---------------------+
                            |                  |      |                     |
                            |  Fraud Engine    +----->+  fraud_assessments  |
                            |  (5-min cycle)   |      |  (4-signal scoring) |
                            |                  |      |                     |
                            +------------------+      +---------------------+
```

---

## Tech Stack

| Technology       | Purpose                          | Why This Choice                                                    |
| ---------------- | -------------------------------- | ------------------------------------------------------------------ |
| Apache Kafka     | Event streaming                  | Industry-standard for real-time data pipelines                     |
| FinBERT          | Sentiment classification         | Domain-specific BERT model fine-tuned on financial text             |
| PostgreSQL       | Persistent storage               | ACID-compliant, excellent for analytical queries                   |
| FastAPI          | REST API + WebSocket             | Async-native Python framework with auto-generated OpenAPI docs     |
| React 18         | Dashboard frontend               | Component-based UI with efficient re-rendering via virtual DOM     |
| Recharts         | Data visualization               | Composable chart library built on React + D3                       |
| APScheduler      | Fraud engine scheduling          | Lightweight Python scheduler (no external deps like Celery/Redis)  |
| Docker Compose   | Orchestration                    | Single-command deployment of all 8 services                        |
| SQLAlchemy 2.0   | ORM                              | Modern Python ORM with type-safe mapped columns                    |

---

## Getting Started

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Git

### One-Command Start

```bash
git clone <repo-url> archer
cd archer
docker-compose up --build
```

Once all containers are healthy:

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Kafka**: localhost:9092

### Local Development (without Docker)

```bash
# Terminal 1 — Infrastructure (requires docker-compose for Kafka + Postgres)
docker-compose up zookeeper kafka postgres

# Terminal 2 — Producer
cd producer && pip install -r requirements.txt && python producer.py

# Terminal 3 — Consumer
cd consumer && pip install -r requirements.txt && python consumer.py

# Terminal 4 — API
cd api && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Terminal 5 — Fraud Engine
cd fraud && pip install -r requirements.txt && python scheduler.py

# Terminal 6 — Frontend
cd frontend && npm install && npm start
```

---

## API Reference

| Method | Endpoint                      | Description                                      |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/health`                     | Server health check                              |
| GET    | `/tickers`                    | All ticker aggregates (sentiment summary)        |
| GET    | `/ticker/{ticker}`            | Single ticker aggregate                          |
| GET    | `/sentiment/recent?limit=50`  | Most recent sentiment scores across all tickers   |
| GET    | `/sentiment/{ticker}?limit=20`| Sentiment history for one ticker                 |
| GET    | `/fraud/risk`                 | Computed fraud risk index per ticker             |
| GET    | `/fraud/assessments`          | Last 50 multi-signal fraud assessments           |
| GET    | `/fraud/assessments/{ticker}` | Last 20 assessments for one ticker               |
| GET    | `/fraud/flagged`              | All transactions flagged by the fraud engine     |
| GET    | `/transactions/{ticker}`      | Transaction history for one ticker               |
| POST   | `/internal/push-sentiment`    | Internal: push sentiment to WebSocket queue      |
| POST   | `/internal/push-fraud`        | Internal: push fraud alert to WebSocket queue    |
| WS     | `/ws/sentiment`               | WebSocket: real-time sentiment + fraud stream    |

---

## How Fraud Detection Works

The fraud engine computes a **weighted composite score (0-1)** from 4 independent signals:

| Signal                  | Weight | What It Measures                                                                 |
| ----------------------- | ------ | -------------------------------------------------------------------------------- |
| **Sentiment Velocity**  | 0.20   | How fast sentiment is deteriorating (early vs. recent half of the 60-min window) |
| **Bearish Concentration** | 0.20 | What fraction of articles in the window are bearish                              |
| **Transaction Anomaly** | 0.25   | Unusual volume, directional skew, or abnormally large trade sizes               |
| **Timing Correlation**  | 0.35   | Fraction of trades that occurred *before* the most negative news dropped        |

**Timing correlation receives the highest weight** because pre-news trading is the single strongest indicator of insider-driven market manipulation.

Risk levels: **CRITICAL** (>0.85) | **HIGH** (>0.60) | **MEDIUM** (>0.30) | **LOW**

When a ticker scores HIGH or CRITICAL, all its transactions in the last 60 minutes are automatically **flagged** for manual review.

---

## Project Structure

```
archer/
|-- docker-compose.yml        # Orchestrates all 8 services
|-- db/
|   |-- database.py           # SQLAlchemy engine + session management
|   |-- models.py             # ORM models (SentimentScore, Transaction, FraudAssessment, etc.)
|-- producer/
|   |-- producer.py           # Kafka news producer (synthetic financial headlines)
|   |-- Dockerfile
|-- consumer/
|   |-- consumer.py           # FinBERT sentiment consumer (Kafka -> PostgreSQL)
|   |-- Dockerfile
|-- api/
|   |-- main.py               # FastAPI app with REST + WebSocket endpoints
|   |-- crud.py               # Database query functions
|   |-- schemas.py            # Pydantic response schemas
|   |-- Dockerfile
|-- fraud/
|   |-- engine.py             # 4-signal fraud correlation engine
|   |-- scheduler.py          # APScheduler entry point (5-min interval)
|   |-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- App.js            # Main dashboard layout
|   |   |-- api.js            # Axios API client
|   |   |-- hooks/
|   |   |   |-- useWebSocket.js  # WebSocket hook with auto-reconnect
|   |   |-- components/
|   |       |-- TickerCard.js          # Per-ticker sentiment card
|   |       |-- LiveFeed.js            # Real-time event feed
|   |       |-- FraudPanel.js          # Fraud risk index table
|   |       |-- SentimentChart.js      # Interactive sentiment timeline
|   |       |-- FlaggedTransactions.js  # Flagged transaction list
|   |-- Dockerfile
|-- model/
|   |-- finbert/              # Cached FinBERT model weights (not in git)
|-- README.md
```

---

> Built as part of a portfolio demonstrating real-time ML systems engineering.
