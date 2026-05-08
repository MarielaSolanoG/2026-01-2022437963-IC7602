#include "checkers.h"

#include <arpa/inet.h>
#include <ctype.h>
#include <curl/curl.h>
#include <netdb.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>
#include <string.h>

static size_t discard_body(void *contents, size_t size, size_t nmemb, void *userp) {
    (void)contents;
    (void)userp;
    return size * nmemb;
}

static int status_code_is_expected(long status_code, const char* expected_codes) {
    if (expected_codes == NULL || strlen(expected_codes) == 0) {
        return status_code == 200;
    }

    const char* p = expected_codes;

    while (*p != '\0') {
        while (*p != '\0' && !isdigit((unsigned char)*p)) {
            p++;
        }

        if (*p == '\0') {
            break;
        }

        int code = 0;

        while (*p != '\0' && isdigit((unsigned char)*p)) {
            code = code * 10 + (*p - '0');
            p++;
        }

        if (code == status_code) {
            return 1;
        }
    }

    return 0;
}

int check_http(
    const char* host,
    int port,
    const char* path,
    const char* expected_codes,
    const char* basic_auth_user,
    const char* basic_auth_pass,
    int timeout_ms,
    double* latency
) {
    CURL *curl = curl_easy_init();
    if (!curl) {
        return 0;
    }

    char url[512];

    if (path == NULL || strlen(path) == 0) {
        path = "/";
    }

    if (path[0] == '/') {
        snprintf(url, sizeof(url), "http://%s:%d%s", host, port, path);
    } else {
        snprintf(url, sizeof(url), "http://%s:%d/%s", host, port, path);
    }

    struct timespec start, end;

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, (long)timeout_ms);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(curl, CURLOPT_NOBODY, 1L);
    if (user && strlen(user) > 0) {
        curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_easy_setopt(curl, CURLOPT_USERNAME, user);
        curl_easy_setopt(curl, CURLOPT_PASSWORD, pass);
    }

    // Evita que el HTML de la respuesta se imprima en los logs.
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discard_body);

    if (basic_auth_user != NULL && strlen(basic_auth_user) > 0) {
        curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_easy_setopt(curl, CURLOPT_USERNAME, basic_auth_user);
        curl_easy_setopt(curl, CURLOPT_PASSWORD, basic_auth_pass != NULL ? basic_auth_pass : "");
    }

    clock_gettime(CLOCK_MONOTONIC, &start);
    CURLcode res = curl_easy_perform(curl);
    clock_gettime(CLOCK_MONOTONIC, &end);

    *latency = (end.tv_sec - start.tv_sec) * 1000.0
             + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    long response_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
    curl_easy_cleanup(curl);

    return (res == CURLE_OK && status_code_is_expected(response_code, expected_codes));
}

int check_tcp(const char* host, int port, int timeout_ms, double* latency) {
    struct addrinfo hints;
    struct addrinfo *result = NULL;
    struct addrinfo *rp = NULL;

    char port_str[16];
    snprintf(port_str, sizeof(port_str), "%d", port);

    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;

    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);

    int gai = getaddrinfo(host, port_str, &hints, &result);
    if (gai != 0) {
        clock_gettime(CLOCK_MONOTONIC, &end);
        *latency = (end.tv_sec - start.tv_sec) * 1000.0
                 + (end.tv_nsec - start.tv_nsec) / 1000000.0;
        return 0;
    }

    int healthy = 0;

    for (rp = result; rp != NULL; rp = rp->ai_next) {
        int sockfd = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
        if (sockfd < 0) {
            continue;
        }

        struct timeval tv;
        tv.tv_sec = timeout_ms / 1000;
        tv.tv_usec = (timeout_ms % 1000) * 1000;

        setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
        setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

        if (connect(sockfd, rp->ai_addr, rp->ai_addrlen) == 0) {
            healthy = 1;
            close(sockfd);
            break;
        }

        close(sockfd);
    }

    freeaddrinfo(result);

    clock_gettime(CLOCK_MONOTONIC, &end);
    *latency = (end.tv_sec - start.tv_sec) * 1000.0
             + (end.tv_nsec - start.tv_nsec) / 1000000.0;

    return healthy;
}