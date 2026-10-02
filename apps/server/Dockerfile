FROM golang:1.27.1-alpine3.23 AS build
WORKDIR /src

# 依存関係の取得はソース変更による再buildと分けてキャッシュする。
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /out/backend . \
    && CGO_ENABLED=0 go build -trimpath -o /out/migrate ./cmd/migrate

FROM alpine:3.23
RUN apk add --no-cache ca-certificates \
    && addgroup -g 10001 app \
    && adduser -D -H -u 10001 -G app app
WORKDIR /app
COPY --from=build /out/backend /out/migrate ./
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/backend"]
