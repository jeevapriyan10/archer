# =============================================================================
# Archer Fraud Engine -- Dockerfile
# =============================================================================
# Copies both the fraud/ module and the db/ module so SQLAlchemy models
# resolve correctly within the container.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

COPY fraud/requirements.txt ./fraud/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=300 -r fraud/requirements.txt

# Copy the db module (models + database) and the fraud module
COPY db/ ./db/
COPY fraud/ ./fraud/

CMD ["python", "fraud/scheduler.py"]
