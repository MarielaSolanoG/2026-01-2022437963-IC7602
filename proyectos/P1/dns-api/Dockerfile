# Etapa 1: compilar el código
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o dns-api .

# Etapa 2: imagen final liviana
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/dns-api .
EXPOSE 8080
CMD ["./dns-api"]