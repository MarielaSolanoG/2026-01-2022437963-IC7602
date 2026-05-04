#pragma once
#include <cstdint>
#include <string>
#include <vector>

struct ResolveResult {
    bool exists = false;
    bool healthy = false;
    std::string type;
    std::string ip;
    int ttl = 300;
};

class ApiClient {
public:
    ApiClient();

    ResolveResult exists(const std::string& domain, const std::string& clientIp);
    std::vector<uint8_t> dnsResolver(const uint8_t* rawPacket, int rawLen);

private:
    std::string baseUrl;

    std::string httpGet(const std::string& url);
    std::string httpPostJson(const std::string& url, const std::string& jsonBody);
};