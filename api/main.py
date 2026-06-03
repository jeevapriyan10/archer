"""
Archer — FastAPI Backend + WebSocket
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
from sqlalchemy.orm import Session

from db.database import init_db, get_db as _get_db_ctx
from api import crud
from api.schemas import (
    TickerAggregateSchema,
    SentimentScoreSchema,
    TransactionSchema,
    FraudRiskSchema,
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
# Internal Push Endpoint (called by consumer to feed WebSocket)
# ---------------------------------------------------------------------------
@app.post("/internal/push-sentiment")
async def push_sentiment(data: SentimentScoreSchema):
    await sentiment_queue.put(data.model_dump(mode="json"))
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
            try:
                data = await asyncio.wait_for(sentiment_queue.get(), timeout=30.0)
                await manager.broadcast(json.dumps({"type": "sentiment", "data": data}))
            except asyncio.TimeoutError:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
