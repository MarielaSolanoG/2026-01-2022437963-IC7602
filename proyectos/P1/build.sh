#!/bin/bash

docker build -t cortes64/dns-api:latest ./dns-api
docker build -t cortes64/dns-interceptor:latest ./dns-interceptor
docker build -t cortes64/dns-ui:latest ./dns-ui
docker build -t cortes64/health-checker:latest ./health-checker