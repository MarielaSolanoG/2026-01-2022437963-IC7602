#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <libpq-fe.h>
#include <curl/curl.h>
#include <string.h>
#include "checkers.h"

void save_health_result(PGconn *conn, const char* target_id, int is_healthy, double latency, const char* location_id) {
    char query[512];
    sprintf(query, 
        "INSERT INTO health_results (target_id, is_healthy, latency_ms, checker_location_id) "
        "VALUES ('%s', %s, %f, '%s')", 
        target_id, is_healthy ? "true" : "false", latency, location_id);

    PGresult *res = PQexec(conn, query);
    if (PQresultStatus(res) != PGRES_COMMAND_OK) {
        fprintf(stderr, "Error guardando resultado: %s\n", PQerrorMessage(conn));
    }
    PQclear(res);
}

int main() {
    curl_global_init(CURL_GLOBAL_ALL);
    PGconn *conn = connect_to_db(); 
    if (!conn) return 1;

    printf("Health Checker iniciado (Proyecto1_IC7602)...\n");

    const char* location_id = getenv("CHECKER_LOCATION_ID") ? getenv("CHECKER_LOCATION_ID") : "CR-01";

    while (1) {
        PGresult *res = PQexec(conn, "SELECT id, ip_address, port, check_type, timeout_ms, basic_auth_user, basic_auth_pass, http_path FROM targets");
        if (PQresultStatus(res) != PGRES_TUPLES_OK) {
            fprintf(stderr, "Error en SELECT: %s\n", PQerrorMessage(conn));
            PQclear(res);
            sleep(30);
            continue;
        }
        
        for (int i = 0; i < PQntuples(res); i++) {
            char *id = PQgetvalue(res, i, 0);
            char *ip = PQgetvalue(res, i, 1);
            int port = atoi(PQgetvalue(res, i, 2));
            char *type = PQgetvalue(res, i, 3);
            int timeout = atoi(PQgetvalue(res, i, 4));
            char *user = PQgetvalue(res, i, 5);
            char *pass = PQgetvalue(res, i, 6);
            char *path = PQgetvalue(res, i, 7);
            
            double latency = 0;
            int alive = 0;

            if (strcmp(type, "HTTP") == 0) {
                char url[512];
                sprintf(url, "http://%s:%d%s", ip, port, path);
                alive = check_http(url, timeout, user, pass, &latency);
            } else {
                alive = check_tcp(ip, port, timeout, &latency);
            }
            
            printf("[%s] Check: %s -> %s (%.2fms)\n", type, ip, alive ? "UP" : "DOWN", latency);
            save_health_result(conn, id, alive, latency, location_id);
        }
        
        PQclear(res);
        sleep(30); 
    }

    PQfinish(conn);
    curl_global_cleanup();
    return 0;
}