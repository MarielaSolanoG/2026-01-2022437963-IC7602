# ── Etapa 1: compilar ─────────────────────────────────────────────────────────
FROM rust:1.96-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

# ── Etapa 2: imagen final ─────────────────────────────────────────────────────
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/target/release/cache-core .

RUN mkdir -p cache_disco

EXPOSE 3000

ENV DOMAIN=localhost
ENV CONFIG_API_URL=http://localhost:4000

CMD ["./cache-core"]