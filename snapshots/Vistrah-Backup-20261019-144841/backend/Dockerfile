FROM python:3.12.10-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY backend/ .
COPY shared/ /shared/
RUN useradd --create-home app && mkdir /data && chown app:app /data
USER app
ENV CATALOGUE_FILE=/shared/catalogue.json
ENV PYTEST_ADDOPTS="-o cache_dir=/tmp/pytest-cache"
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
