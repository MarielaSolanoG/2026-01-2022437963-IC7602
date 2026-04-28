#include <iostream>
#include "dns_parser.h"

int main() {
    // Paquete DNS real — consulta para "google.com"
    uint8_t test_packet[] = {
        0xA1, 0xB2,              // ID
        0x01, 0x00,              // Flags: QR=0, OPCODE=0
        0x00, 0x01,              // QDCOUNT = 1
        0x00, 0x00,              // ANCOUNT = 0
        0x00, 0x00,              // NSCOUNT = 0
        0x00, 0x00,              // ARCOUNT = 0
        0x06,'g','o','o','g','l','e',  // "google"
        0x03,'c','o','m',              // "com"
        0x00,                          // fin
        0x00, 0x01,              // QTYPE = A
        0x00, 0x01               // QCLASS = IN
    };

    DNSHeader header = parseHeader(test_packet, sizeof(test_packet));
    std::string domain = extractDomain(test_packet, sizeof(test_packet));

    std::cout << "ID: " << std::hex << header.id << std::endl;
    std::cout << "QR: " << (int)getQR(header.flags) << std::endl;
    std::cout << "OPCODE: " << (int)getOpcode(header.flags) << std::endl;
    std::cout << "Dominio: " << domain << std::endl;

    return 0;
}