"""
Archer — FinBERT Sentiment Consumer
Consumes financial news articles from Kafka, runs them through FinBERT
sentiment classification, persists results to PostgreSQL, and prints output.
"""

import sys
import os

# Allow imports from the project root (e.g. db.database, db.models)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import time
import requests
from datetime import datetime, timezone
import selectors

# ---------------------------------------------------------------------------
# Windows Python 3.12+ Compatibility Patch
# ---------------------------------------------------------------------------
# Workaround for selectors.DefaultSelector.unregister on Windows where closed
# socket file descriptors raise ValueError: "Invalid file descriptor: -1".
# ---------------------------------------------------------------------------
_orig_unregister = selectors.DefaultSelector.unregister

def _safe_unregister(self, fileobj):
    try:
        return _orig_unregister(self, fileobj)
    except (ValueError, AttributeError) as e:
        if isinstance(e, ValueError) and "Invalid file descriptor" in str(e):
            for fd, key in list(self._fd_to_key.items()):
                if key.fileobj is fileobj:
                    self._fd_to_key.pop(fd, None)
                    if hasattr(self, '_readers'):
                        self._readers.discard(fd)
                    if hasattr(self, '_writers'):
                        self._writers.discard(fd)
                    return key
            return None
        if isinstance(e, AttributeError) and "'NoneType' object" in str(e):
            return None
        raise

selectors.DefaultSelector.unregister = _safe_unregister


# ---------------------------------------------------------------------------
# Load FinBERT Model
# ---------------------------------------------------------------------------
LOCAL_MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "model", "finbert")
)

if os.path.isdir(LOCAL_MODEL_DIR) and os.listdir(LOCAL_MODEL_DIR):
    model_source = LOCAL_MODEL_DIR
    print(f"[ARCHER] Loading FinBERT model from local directory: {LOCAL_MODEL_DIR}")
else:
    model_source = "ProsusAI/finbert"
    print(f"[ARCHER] Loading FinBERT model from HuggingFace Hub ({model_source})...")

# pyrefly: ignore [missing-import]
from transformers import pipeline as hf_pipeline

sentiment_pipeline = hf_pipeline(
    "text-classification",
    model=model_source,
    return_all_scores=True,
)

print("[ARCHER] FinBERT ready.")


# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------
from db.database import init_db, get_db
from db.models import SentimentScore, TickerAggregate
from sqlalchemy import text

init_db()
print("[ARCHER] Database initialized. Connecting to Kafka...")


# ---------------------------------------------------------------------------
# Kafka Consumer Setup
# ---------------------------------------------------------------------------
# pyrefly: ignore [missing-import]
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    "raw-news",
    bootstrap_servers="localhost:9092",
    group_id="sentiment-group",
    auto_offset_reset="earliest",
    value_deserializer=lambda m: json.loads(m.decode("utf-8")),
)

print("[ARCHER] Consuming from raw-news topic...\n")


# ---------------------------------------------------------------------------
# Sentiment Analysis
# ---------------------------------------------------------------------------
def analyze_sentiment(headline: str) -> dict:
    """Run a news headline through FinBERT and return classification scores."""
    truncated = headline[:512]
    raw_results = sentiment_pipeline(truncated)

    # Support flat or nested list formats depending on transformers version
    if isinstance(raw_results[0], list):
        results = raw_results[0]
    else:
        results = raw_results

    scores = {entry["label"]: round(entry["score"], 4) for entry in results}

    positive = scores.get("positive", 0.0)
    negative = scores.get("negative", 0.0)
    neutral = scores.get("neutral", 0.0)

    sentiment_score = round(positive - negative, 4)

    if sentiment_score > 0.2:
        sentiment_label = "BULLISH"
    elif sentiment_score < -0.2:
        sentiment_label = "BEARISH"
    else:
        sentiment_label = "NEUTRAL"

    return {
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
    }


# ---------------------------------------------------------------------------
# Database Persistence
# ---------------------------------------------------------------------------
UPSERT_SQL = text("""
    INSERT INTO ticker_aggregates
        (ticker, avg_sentiment, bullish_count, bearish_count, neutral_count,
         total_articles, last_score, last_label, last_updated)
    VALUES
        (:ticker, :score, :bullish, :bearish, :neutral,
         1, :score, :label, now())
    ON CONFLICT (ticker) DO UPDATE SET
        avg_sentiment = (
            ticker_aggregates.avg_sentiment * ticker_aggregates.total_articles
            + EXCLUDED.avg_sentiment
        ) / (ticker_aggregates.total_articles + 1),
        bullish_count  = ticker_aggregates.bullish_count  + EXCLUDED.bullish_count,
        bearish_count  = ticker_aggregates.bearish_count  + EXCLUDED.bearish_count,
        neutral_count  = ticker_aggregates.neutral_count  + EXCLUDED.neutral_count,
        total_articles = ticker_aggregates.total_articles + 1,
        last_score     = EXCLUDED.last_score,
        last_label     = EXCLUDED.last_label,
        last_updated   = now()
""")


def save_to_db(enriched: dict):
    """Persist a single enriched sentiment record and update ticker aggregates."""
    try:
        with get_db() as session:
            record = SentimentScore(
                ticker=enriched["ticker"],
                headline=enriched["headline"],
                source=enriched["source"],
                sentiment_score=enriched["sentiment_score"],
                positive=enriched["positive"],
                negative=enriched["negative"],
                neutral=enriched["neutral"],
                sentiment_label=enriched["sentiment_label"],
                article_id=enriched["id"],
                article_ts=int(enriched["timestamp"]),
            )
            session.add(record)

            label = enriched["sentiment_label"]
            session.execute(UPSERT_SQL, {
                "ticker": enriched["ticker"],
                "score": enriched["sentiment_score"],
                "bullish": 1 if label == "BULLISH" else 0,
                "bearish": 1 if label == "BEARISH" else 0,
                "neutral": 1 if label == "NEUTRAL" else 0,
                "label": label,
            })

            session.commit()
    except Exception as e:
        print(f"[DB ERROR] Failed to save {enriched.get('id', '???')}: {e}")


# ---------------------------------------------------------------------------
# Consumer Loop
# ---------------------------------------------------------------------------
SEPARATOR = "-" * 50

try:
    for message in consumer:
        article = message.value
        ticker = article.get("ticker", "UNKNOWN")
        headline = article.get("headline", "")
        source = article.get("source", "N/A")
        msg_timestamp = article.get("timestamp", 0)
        msg_id = article.get("id", "????????")

        try:
            sentiment = analyze_sentiment(headline)
        except Exception as e:
            print(f"[ERROR] Failed to analyze message {msg_id}: {e}")
            continue

        readable_time = datetime.fromtimestamp(
            msg_timestamp, tz=timezone.utc
        ).strftime("%Y-%m-%d %H:%M:%S UTC")

        enriched = {
            "id": msg_id,
            "ticker": ticker,
            "headline": headline,
            "source": source,
            "timestamp": msg_timestamp,
            "positive": sentiment["positive"],
            "negative": sentiment["negative"],
            "neutral": sentiment["neutral"],
            "sentiment_score": sentiment["sentiment_score"],
            "sentiment_label": sentiment["sentiment_label"],
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

        print(SEPARATOR)
        print(f"[ARCHER] {ticker} | {sentiment['sentiment_label']} | score: {sentiment['sentiment_score']}")
        print(f"Headline : {headline}")
        print(f"Source   : {source}")
        print(f"Scores   -> pos: {sentiment['positive']} | neg: {sentiment['negative']} | neu: {sentiment['neutral']}")
        print(f"Time     : {readable_time}")
        print(SEPARATOR)

        save_to_db(enriched)
        print(f"[DB] Saved -> {ticker} | {sentiment['sentiment_label']} | {sentiment['sentiment_score']}")

        # Push to API WebSocket queue (fire-and-forget)
        try:
            requests.post(
                "http://localhost:8000/internal/push-sentiment",
                json=enriched,
                timeout=1,
            )
        except Exception:
            print("[WS] API not available, skipping push")

        print()

except KeyboardInterrupt:
    print("\n[ARCHER] Shutting down...")
    consumer.close()
    print("[ARCHER] Consumer shut down cleanly.")
