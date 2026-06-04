"""
Archer -- Fraud Engine Scheduler

Runs the fraud correlation engine on a fixed 5-minute interval using
APScheduler's BlockingScheduler.  A single immediate run is triggered
at startup so operators see results without a 5-minute cold start.
"""

import sys
import os

# Allow imports from project root (db.models, db.database, fraud.engine)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apscheduler.schedulers.blocking import BlockingScheduler

from fraud.engine import FraudEngine
from db.database import SessionLocal, init_db

engine = FraudEngine()


def run_assessment():
    """Open a fresh DB session, run the full assessment cycle, then close."""
    db = SessionLocal()
    try:
        engine.run_full_assessment(db)
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure the fraud_assessments table exists before first run
    init_db()

    # Immediate first assessment so console shows output right away
    print("[ARCHER] Running initial fraud assessment...")
    run_assessment()

    # Schedule recurring assessments every 5 minutes
    scheduler = BlockingScheduler()
    scheduler.add_job(
        run_assessment,
        "interval",
        minutes=5,
        id="fraud_assessment",
    )

    print("[ARCHER] Fraud engine scheduler started. Running every 5 minutes.")

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("[ARCHER] Fraud engine scheduler stopped.")
