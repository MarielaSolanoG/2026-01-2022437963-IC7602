cmake_minimum_required(VERSION 3.10)
project(dns_interceptor)

set(CMAKE_CXX_STANDARD 17)

add_executable(dns_interceptor
    src/main.cpp
    src/dns_parser.cpp
    src/udp_server.cpp
    src/base64.cpp
    src/api_client.cpp
    src/dns_response.cpp
    src/query_handler.cpp
)

target_include_directories(dns_interceptor PRIVATE src)

find_package(Threads REQUIRED)
target_link_libraries(dns_interceptor Threads::Threads)