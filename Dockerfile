# ── Stage 1: Build React frontend ──
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard/ .
RUN npm run build

# ── Stage 2: Install Python dependencies ──
FROM python:3.11-slim AS py-builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Final image ──
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=py-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade --no-cache-dir yt-dlp

COPY . .

# Copy built frontend into /app/static
COPY --from=frontend-builder /frontend/dist /app/static

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser
RUN mkdir -p /app/uploads /app/output /tmp/Ultralytics
RUN chown -R appuser:appuser /app /tmp/Ultralytics

USER appuser
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
