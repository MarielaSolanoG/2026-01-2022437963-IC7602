#!/bin/bash
# $1 is the username
docker login
cd dns-interceptor
docker build -t $1/dns-interceptor:latest .
docker push $1/dns-interceptor:latest

cd ../ui
docker build -t $1/ui:latest .
docker push $1/ui:latest

cd ../java-rest-api
docker build -t $1/java-rest-api:latest .
docker push $1/java-rest-api:latest

cd ../zonal-cache/cache-core
docker build -t $1/zonal-cache:latest .
docker push $1/zonal-cache:latest