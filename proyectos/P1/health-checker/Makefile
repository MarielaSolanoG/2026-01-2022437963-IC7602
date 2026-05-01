CC = gcc
CFLAGS = -Wall -Wextra -O2
LIBS = -lcurl -lpthread -lpq

SRC = src/main.c src/checkers.c src/db_client.c src/network_utils.c
OUT = bin/health-checker

all: build

build:
	mkdir -p bin
	$(CC) $(CFLAGS) $(SRC) -o $(OUT) $(LIBS)

clean:
	rm -rf bin