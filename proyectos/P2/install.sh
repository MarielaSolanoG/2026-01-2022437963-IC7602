#!/bin/bash
cd charts
helm upgrade --install dns-interceptor dns-interceptor \
  --set env.supabaseUrl="https://dvplejlmeilcwmsuwsdn.supabase.co" \
  --set env.supabaseKey="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cGxlamxtZWlsY3dtc3V3c2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzk5NTQsImV4cCI6MjA5MTg1NTk1NH0.WEtmsygYG0RmFNr1FGMdX7wE9CEF8U5iUqINTMTa8CI" \
  --set env.zonalCacheLatamIp="127.0.0.1" \
  --set env.zonalCacheUsaIp="127.0.0.1" \
  --set env.zonalCacheEuropeIp="127.0.0.1"
helm upgrade --install ui ui