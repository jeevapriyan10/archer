# =============================================================================
# Archer Consumer — Dockerfile (Placeholder)
# =============================================================================
# Will be fully configured in Module 2 when FinBERT consumer is built.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY consumer.py .

CMD ["python", "consumer.py"]
