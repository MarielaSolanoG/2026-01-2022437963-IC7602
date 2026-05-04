#include "udp_server.h"

#include <cstdlib>
#include <iostream>
#include <string>

int main() {
    int port = 53;

    const char* portEnv = std::getenv("DNS_PORT");
    if (portEnv != nullptr) {
        port = std::stoi(portEnv);
    }

    std::cout << "[DNS Interceptor] Escuchando en UDP/" << port << std::endl;

    startServer(port);

    return 0;
}