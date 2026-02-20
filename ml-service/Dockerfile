# FastAPI ML microservice for Expert Intelligence Platform
# Deploy to AWS App Runner, ECS, or any container service

FROM python:3.11-slim

WORKDIR /app

# System deps for psycopg2 and build
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Optional: persist trained models and encoders
RUN mkdir -p /app/models

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
