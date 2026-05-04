#include "api_client.h"
#include "base64.h"

#include <cctype>
#include <cstdlib>
#include <cstring>
#include <iomanip>
#include <netdb.h>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <sys/socket.h>
#include <unistd.h>

struct ParsedBaseUrl {
    std::string host;
    std::string port;
    std::string prefix;
};

static ParsedBaseUrl parseBaseUrl(const std::string& baseUrl) {
    std::string url = baseUrl;
    const std::string httpPrefix = "http://";

    if (url.rfind(httpPrefix, 0) == 0) {
        url = url.substr(httpPrefix.size());
    }

    if (url.rfind("https://", 0) == 0) {
        throw std::runtime_error("Este cliente simple soporta HTTP. Use DNS_API_URL=http://host:puerto");
    }

    std::string hostPort = url;
    std::string prefix;

    auto slashPos = url.find('/');
    if (slashPos != std::string::npos) {
        hostPort = url.substr(0, slashPos);
        prefix = url.substr(slashPos);
    }

    std::string host = hostPort;
    std::string port = "80";

    auto colonPos = hostPort.find(':');
    if (colonPos != std::string::npos) {
        host = hostPort.substr(0, colonPos);
        port = hostPort.substr(colonPos + 1);
    }

    return {host, port, prefix};
}

static std::string urlEncode(const std::string& value) {
    std::ostringstream escaped;
    escaped.fill('0');
    escaped << std::hex;

    for (unsigned char c : value) {
        if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
        } else {
            escaped << '%' << std::uppercase << std::setw(2) << int(c) << std::nouppercase;
        }
    }

    return escaped.str();
}

static std::string jsonEscape(const std::string& value) {
    std::string out;

    for (char c : value) {
        if (c == '"') {
            out += "\\\"";
        } else if (c == '\\') {
            out += "\\\\";
        } else {
            out += c;
        }
    }

    return out;
}

static std::string sendHttpRequest(
    const std::string& baseUrl,
    const std::string& method,
    const std::string& path,
    const std::string& body = ""
) {
    ParsedBaseUrl parsed = parseBaseUrl(baseUrl);

    addrinfo hints{};
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    addrinfo* result = nullptr;
    int gai = getaddrinfo(parsed.host.c_str(), parsed.port.c_str(), &hints, &result);

    if (gai != 0) {
        throw std::runtime_error(std::string("getaddrinfo falló: ") + gai_strerror(gai));
    }

    int sock = -1;

    for (addrinfo* rp = result; rp != nullptr; rp = rp->ai_next) {
        sock = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);

        if (sock == -1) {
            continue;
        }

        if (connect(sock, rp->ai_addr, rp->ai_addrlen) == 0) {
            break;
        }

        close(sock);
        sock = -1;
    }

    freeaddrinfo(result);

    if (sock == -1) {
        throw std::runtime_error("No se pudo conectar con DNS API en " + parsed.host + ":" + parsed.port);
    }

    std::string fullPath = parsed.prefix + path;
    if (fullPath.empty()) {
        fullPath = "/";
    }

    std::ostringstream request;
    request << method << " " << fullPath << " HTTP/1.1\r\n";
    request << "Host: " << parsed.host << "\r\n";
    request << "Connection: close\r\n";

    if (method == "POST") {
        request << "Content-Type: application/json\r\n";
        request << "Content-Length: " << body.size() << "\r\n";
    }

    request << "\r\n";

    if (method == "POST") {
        request << body;
    }

    std::string requestStr = request.str();

    size_t totalSent = 0;
    while (totalSent < requestStr.size()) {
        ssize_t sent = send(
            sock,
            requestStr.c_str() + totalSent,
            requestStr.size() - totalSent,
            0
        );

        if (sent <= 0) {
            close(sock);
            throw std::runtime_error("No se pudo enviar request HTTP al DNS API");
        }

        totalSent += sent;
    }

    std::string response;
    char buffer[4096];

    while (true) {
        ssize_t n = recv(sock, buffer, sizeof(buffer), 0);

        if (n <= 0) {
            break;
        }

        response.append(buffer, n);
    }

    close(sock);

    auto headerEnd = response.find("\r\n\r\n");
    if (headerEnd == std::string::npos) {
        throw std::runtime_error("Respuesta HTTP inválida del DNS API");
    }

    std::string headers = response.substr(0, headerEnd);
    std::string responseBody = response.substr(headerEnd + 4);

    std::smatch statusMatch;
    std::regex statusRegex("HTTP/[0-9.]+\\s+([0-9]+)");

    int status = 0;

    if (std::regex_search(headers, statusMatch, statusRegex)) {
        status = std::stoi(statusMatch[1]);
    }

    if (status >= 400 || status == 0) {
        throw std::runtime_error("DNS API respondió HTTP " + std::to_string(status) + ": " + responseBody);
    }

    return responseBody;
}

static bool jsonBool(const std::string& json, const std::string& key, bool defaultValue = false) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*(true|false)");
    std::smatch match;

    if (std::regex_search(json, match, pattern)) {
        return match[1] == "true";
    }

    return defaultValue;
}

static std::string jsonString(const std::string& json, const std::string& key) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
    std::smatch match;

    if (std::regex_search(json, match, pattern)) {
        return match[1];
    }

    return "";
}

static int jsonInt(const std::string& json, const std::string& key, int defaultValue = 0) {
    std::regex pattern("\\\"" + key + "\\\"\\s*:\\s*([0-9]+)");
    std::smatch match;

    if (std::regex_search(json, match, pattern)) {
        return std::stoi(match[1]);
    }

    return defaultValue;
}

ApiClient::ApiClient() {
    const char* envUrl = std::getenv("DNS_API_URL");
    baseUrl = envUrl ? std::string(envUrl) : "http://localhost:8080";

    if (!baseUrl.empty() && baseUrl.back() == '/') {
        baseUrl.pop_back();
    }
}

std::string ApiClient::httpGet(const std::string& url) {
    return sendHttpRequest(baseUrl, "GET", url);
}

std::string ApiClient::httpPostJson(const std::string& url, const std::string& jsonBody) {
    return sendHttpRequest(baseUrl, "POST", url, jsonBody);
}

ResolveResult ApiClient::exists(const std::string& domain, const std::string& clientIp) {
    std::string path = "/api/exists?domain=" + urlEncode(domain) + "&client_ip=" + urlEncode(clientIp);
    std::string body = httpGet(path);

    ResolveResult result;
    result.exists = jsonBool(body, "exists", false);
    result.healthy = jsonBool(body, "healthy", false);
    result.type = jsonString(body, "type");
    result.ip = jsonString(body, "ip");
    result.ttl = jsonInt(body, "ttl", 300);

    return result;
}

std::vector<uint8_t> ApiClient::dnsResolver(const uint8_t* rawPacket, int rawLen) {
    std::string encoded = base64Encode(rawPacket, rawLen);
    std::string jsonBody = "{\"data\":\"" + jsonEscape(encoded) + "\"}";

    std::string response = httpPostJson("/api/dns_resolver", jsonBody);
    std::string encodedResponse = jsonString(response, "data");

    if (encodedResponse.empty()) {
        throw std::runtime_error("La respuesta de /api/dns_resolver no contiene data");
    }

    return base64Decode(encodedResponse);
}