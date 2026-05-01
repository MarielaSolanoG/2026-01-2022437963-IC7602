#include <curl/curl.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <time.h>

int check_http(const char* url, int timeout_ms, double* latency) {
    CURL *curl = curl_easy_init();
    if (!curl) return 0;

    struct timespec start, end;
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, (long)timeout_ms);

    clock_gettime(CLOCK_MONOTONIC, &start);
    CURLcode res = curl_easy_perform(curl);
    clock_gettime(CLOCK_MONOTONIC, &end);

    *latency = (end.tv_sec - start.tv_sec) * 1000.0 + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    long response_code;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

    curl_easy_cleanup(curl);

    return (res == CURLE_OK && response_code == 200);
}