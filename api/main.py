"""
Archer -- FastAPI Backend + WebSocket
"""

import sys
import os
import asyncio
import json
from datetime import datetime, timezone

# Allow imports from project root for db module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc
from sqlalchemy.orm import Session

from db.database import init_db, get_db as _get_db_ctx
from db.models import FraudAssessment, Transaction
from api import crud
from api.schemas import (
    TickerAggregateSchema,
    SentimentScoreSchema,
    TransactionSchema,
    FraudRiskSchema,
    FraudAssessmentSchema,
    HealthSchema,
)

# ---------------------------------------------------------------------------
# App Setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Archer - Financial Sentiment & Fraud Risk Engine",
    version="1.0.0",
)

# Allow React frontend on any port to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# DB Dependency
# ---------------------------------------------------------------------------
# FastAPI needs a generator-style dependency (yield), not a context manager
def get_db():
    with _get_db_ctx() as session:
        yield session


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    init_db()
    print("[ARCHER API] Database tables verified. Server ready.")


# ---------------------------------------------------------------------------
# WebSocket Manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()
sentiment_queue: asyncio.Queue = asyncio.Queue()
# Separate queue for fraud alerts so they don't block sentiment flow
fraud_queue: asyncio.Queue = asyncio.Queue()


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthSchema)
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc)}


@app.get("/tickers", response_model=list[TickerAggregateSchema])
async def list_tickers(db: Session = Depends(get_db)):
    return crud.get_all_tickers(db)


@app.get("/ticker/{ticker}", response_model=TickerAggregateSchema)
async def get_ticker(ticker: str, db: Session = Depends(get_db)):
    row = crud.get_ticker(db, ticker)
    if not row:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")
    return row


@app.get("/sentiment/recent", response_model=list[SentimentScoreSchema])
async def recent_sentiment(limit: int = 50, db: Session = Depends(get_db)):
    return crud.get_recent_sentiment(db, limit)


@app.get("/sentiment/{ticker}", response_model=list[SentimentScoreSchema])
async def ticker_sentiment(ticker: str, limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_ticker_sentiment(db, ticker, limit)


@app.get("/fraud/risk", response_model=list[FraudRiskSchema])
async def fraud_risk(db: Session = Depends(get_db)):
    return crud.get_fraud_risk(db)


@app.get("/transactions/{ticker}", response_model=list[TransactionSchema])
async def ticker_transactions(ticker: str, limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_transactions(db, ticker, limit)


# ---------------------------------------------------------------------------
# Fraud Correlation Engine Endpoints (Module 5)
# ---------------------------------------------------------------------------

@app.get("/fraud/assessments", response_model=list[FraudAssessmentSchema])
async def list_fraud_assessments(db: Session = Depends(get_db)):
    """Return the 50 most recent fraud assessments across all tickers."""
    return (
        db.query(FraudAssessment)
        .order_by(desc(FraudAssessment.assessed_at))
        .limit(50)
        .all()
    )


@app.get("/fraud/assessments/{ticker}", response_model=list[FraudAssessmentSchema])
async def ticker_fraud_assessments(ticker: str, db: Session = Depends(get_db)):
    """Return the 20 most recent fraud assessments for a specific ticker."""
    return (
        db.query(FraudAssessment)
        .filter(FraudAssessment.ticker == ticker.upper())
        .order_by(desc(FraudAssessment.assessed_at))
        .limit(20)
        .all()
    )


@app.get("/fraud/flagged", response_model=list[TransactionSchema])
async def flagged_transactions(db: Session = Depends(get_db)):
    """Return all transactions that were flagged by the fraud engine."""
    return (
        db.query(Transaction)
        .filter(Transaction.flagged == True)
        .order_by(desc(Transaction.timestamp))
        .all()
    )


# ---------------------------------------------------------------------------
# Internal Push Endpoints (called by workers to feed WebSocket)
# ---------------------------------------------------------------------------
@app.post("/internal/push-sentiment")
async def push_sentiment(data: SentimentScoreSchema):
    await sentiment_queue.put(data.model_dump(mode="json"))
    return {"queued": True}


@app.post("/internal/push-fraud")
async def push_fraud(data: FraudAssessmentSchema):
    """Accept fraud assessment from the engine and broadcast to WS clients."""
    payload = data.model_dump(mode="json")
    await fraud_queue.put(payload)
    # Broadcast immediately so dashboard clients see it without waiting
    await manager.broadcast(json.dumps({"type": "fraud", "data": payload}))
    return {"queued": True}


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws/sentiment")
async def ws_sentiment(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_text(
            json.dumps({"type": "connected", "message": "Archer WebSocket live"})
        )
        while True:
            # Listen on both queues concurrently so fraud alerts flow through
            # the same WebSocket connection alongside sentiment updates.
            sentiment_task = asyncio.ensure_future(sentiment_queue.get())
            fraud_task = asyncio.ensure_future(fraud_queue.get())

            try:
                done, pending = await asyncio.wait(
                    [sentiment_task, fraud_task],
                    timeout=30.0,
                    return_when=asyncio.FIRST_COMPLETED,
                )
            except asyncio.CancelledError:
                sentiment_task.cancel()
                fraud_task.cancel()
                break

            # Cancel whichever task did not complete
            for task in pending:
                task.cancel()

            if not done:
                # Timeout — send heartbeat to keep connection alive
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
                continue

            for task in done:
                data = task.result()
                # Determine message type from which queue finished
                if task is sentiment_task:
                    await manager.broadcast(
                        json.dumps({"type": "sentiment", "data": data})
                    )
                else:
                    await manager.broadcast(
                        json.dumps({"type": "fraud", "data": data})
                    )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
