#!/usr/bin/env bash
set -e
cp -n .env.example .env || true
docker compose up --build -d
echo "Vistra API: http://localhost:8000/docs"
echo "Health:      http://localhost:8000/health"
