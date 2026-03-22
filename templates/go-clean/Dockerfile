FROM golang:1.22-alpine AS build
WORKDIR /src
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o /bin/server ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /bin/server ./server
ENV PORT={{PORT}}
EXPOSE {{PORT}}
CMD ["./server"]
