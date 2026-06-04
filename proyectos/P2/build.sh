#!/bin/bash
# $1 is the username
docker login
cd dns-interceptor
docker build -t $1/dns-interceptor:latest .
docker push $1/dns-interceptor:latest