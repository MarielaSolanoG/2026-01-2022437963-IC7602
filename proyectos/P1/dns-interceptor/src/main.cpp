#include <iostream>
#include "udp_server.h"

int main() {
    try {
        startServer(8053);  // puerto 5353 para pruebas (53 requiere sudo)
    } catch (const std::exception& e) {
        std::cerr << "Error fatal: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}