#!/bin/bash
cd charts
helm upgrade --install dns-interceptor dns-interceptor
helm upgrade --install ui ui