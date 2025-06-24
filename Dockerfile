# Dockerfile

FROM node:18-slim

# Install Chromium + deps for Puppeteer
RUN apt-get update && \
    apt-get install -y \
      chromium \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libgdk-pixbuf2.0-0 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libx11-xcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      libxss1 \
      libxtst6 \
      xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p /usr/src/app/sessions

# Tell Puppeteer which Chromium to use
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node","src/index.js"]
