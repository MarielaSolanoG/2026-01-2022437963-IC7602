#!/bin/bash
helm list
helm uninstall dns-interceptor
sleep 45

helm uninstall ui