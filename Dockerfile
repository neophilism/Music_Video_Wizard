FROM node:22.23.3-trixie-slim AS app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-venv \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY analysis/requirements.txt ./analysis/requirements.txt
RUN python3 -m venv /opt/music-video-wizard-venv \
  && /opt/music-video-wizard-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/music-video-wizard-venv/bin/pip install --no-cache-dir -r analysis/requirements.txt

ENV PATH="/opt/music-video-wizard-venv/bin:${PATH}"

COPY . .

# Build-time values are non-secret placeholders only. Runtime values override them.
ENV NODE_ENV=production \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef \
    BETTER_AUTH_URL=http://127.0.0.1:3000 \
    ASSET_STORAGE_DRIVER=local \
    ASSET_STORAGE_BUCKET=build-assets \
    AUDIO_TRANSCRIPTION_PROVIDER=none \
    TEXT_GENERATION_PROVIDER=none \
    IMAGE_GENERATION_PROVIDER=none \
    VIDEO_GENERATION_PROVIDER=none

RUN npm run db:generate \
  && npm run build

EXPOSE 10000

CMD ["sh","-c","npm start -- -H 0.0.0.0 -p ${PORT:-10000}"]
