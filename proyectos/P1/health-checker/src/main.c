#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <libpq-fe.h>
#include <curl/curl.h>
#include <string.h>
#include "checkers.h"

void save_health_result(PGconn *conn, const char* target_id, int is_healthy, double latency) {
    char query[512];
    sprintf(query, 
        "INSERT INTO health_results (target_id, is_healthy, latency_ms, checker_location_id) "
        "VALUES ('%s', %s, %f, 'CR-01')", 
        target_id, is_healthy ? "true" : "false", latency);
    
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

    while (1) {
        PGresult *res = PQexec(conn, "SELECT id, ip_address, port, check_type, timeout_ms FROM targets");
        if (PQresultStatus(res) != PGRES_TUPLES_OK) {
            fprintf(stderr, "Error en SELECT: %s\n", PQerrorMessage(conn));
            fflush(stderr);
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
            
            double latency = 0;
            int alive = 0;

            if (strcmp(type, "HTTP") == 0) {
                char url[256];
                sprintf(url, "http://%s:%d", ip, port);
                alive = check_http(url, timeout, &latency);
            } else {
                alive = check_tcp(ip, port, timeout);
            }
            
            printf("[%s] Check: %s -> %s (%.2fms)\n", type, ip, alive ? "UP" : "DOWN", latency);
            
            save_health_result(conn, id, alive, latency);
        }
        
        PQclear(res);
        sleep(30); 
    }

    PQfinish(conn);
    curl_global_cleanup();
    return 0;
}