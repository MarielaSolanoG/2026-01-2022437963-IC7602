#pragma once
#include "dns_parser.h"
#include <netinet/in.h>

// Estructura que agrupa todo lo necesario para procesar una consulta
struct ClientRequest {
    uint8_t buffer[512];        // bytes crudos del paquete
    int len;                    // cuántos bytes llegaron
    struct sockaddr_in client;  // dirección del cliente para responderle
    int server_socket;          // el socket del servidor para enviar la respuesta
};

// Arranca el servidor, se queda en loop infinito
void startServer(int port);

// Función que corre en cada hilo — procesa una consulta
void handleRequest(ClientRequest req);