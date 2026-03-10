FROM ubuntu:22.04
RUN apt update && \
    apt install -y iptables iproute2 dnsutils curl netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*
COPY router.sh /router.sh
RUN chmod +x /router.sh
CMD ["/router.sh"]