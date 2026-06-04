# =============================================================================
# Archer API -- Dockerfile
# =============================================================================
# FastAPI + Uvicorn server. Copies db/ module for ORM model access.
# =============================================================================

FROM python:3.10-slim

WORKDIR /app

COPY api/requirements.txt ./api/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --default-timeout=300 -r api/requirements.txt

# Copy db module and api module
COPY db/ ./db/
COPY api/ ./api/

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
