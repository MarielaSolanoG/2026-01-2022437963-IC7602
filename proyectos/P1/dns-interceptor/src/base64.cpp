#include "base64.h"

static const std::string BASE64_CHARS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

std::string base64Encode(const uint8_t* data, int len) {
    std::string out;
    int val = 0;
    int valb = -6;

    for (int i = 0; i < len; ++i) {
        val = (val << 8) + data[i];
        valb += 8;

        while (valb >= 0) {
            out.push_back(BASE64_CHARS[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }

    if (valb > -6) {
        out.push_back(BASE64_CHARS[((val << 8) >> (valb + 8)) & 0x3F]);
    }

    while (out.size() % 4) {
        out.push_back('=');
    }

    return out;
}

std::vector<uint8_t> base64Decode(const std::string& input) {
    std::vector<int> table(256, -1);

    for (int i = 0; i < 64; i++) {
        table[static_cast<unsigned char>(BASE64_CHARS[i])] = i;
    }

    std::vector<uint8_t> out;
    int val = 0;
    int valb = -8;

    for (unsigned char c : input) {
        if (c == '=') {
            break;
        }

        if (table[c] == -1) {
            continue;
        }

        val = (val << 6) + table[c];
        valb += 6;

        if (valb >= 0) {
            out.push_back(static_cast<uint8_t>((val >> valb) & 0xFF));
            valb -= 8;
        }
    }

    return out;
}