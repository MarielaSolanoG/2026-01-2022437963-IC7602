#ifndef CHECKERS_H
#define CHECKERS_H

int check_http(
    const char* host,
    int port,
    const char* path,
    const char* expected_codes,
    const char* basic_auth_user,
    const char* basic_auth_pass,
    int timeout_ms,
    double* latency
);

int check_tcp(
    const char* host,
    int port,
    int timeout_ms,
    double* latency
);

#endif