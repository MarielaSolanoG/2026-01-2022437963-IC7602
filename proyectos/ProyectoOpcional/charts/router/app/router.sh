#!/usr/bin/env bash
set -e

echo "[Router] Iniciando configuración de NAT..."

# ========================================
# Paso 1: Habilitar IP forwarding
# ========================================
sysctl -w net.ipv4.ip_forward=1 > /dev/null 2>&1
sysctl -w net.ipv4.conf.all.send_redirects=0 > /dev/null 2>&1
echo "[Router] IP forwarding habilitado"

# ========================================
# Paso 2: Limpiar reglas previas
# ========================================
iptables -F 2>/dev/null || true
iptables -X 2>/dev/null || true
iptables -t nat -F 2>/dev/null || true
iptables -t nat -X 2>/dev/null || true

# Políticas por defecto
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -t nat -P PREROUTING ACCEPT
iptables -t nat -P POSTROUTING ACCEPT
iptables -t nat -P OUTPUT ACCEPT

echo "[Router] Reglas antiguas limpiadas"

# ========================================
# Paso 3: Resolver DNSs a IPs
# ========================================
APACHE1_DNS="${APACHE1_DNS:-proyecto-apache1.privado.svc.cluster.local}"
APACHE2_DNS="${APACHE2_DNS:-proyecto-apache2.privado.svc.cluster.local}"
INGRESS_DNS="${INGRESS_DNS:-proyecto-ingress-nginx-controller.publico.svc.cluster.local}"
ASTERISK_DNS="${ASTERISK_DNS:-asterisk.privado.svc.cluster.local}"

# Resolver a IP (ClusterIP)
AP1_IP=$(getent hosts "$APACHE1_DNS" 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")
AP2_IP=$(getent hosts "$APACHE2_DNS" 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")
ING_IP=$(getent hosts "$INGRESS_DNS" 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")
AST_IP=$(getent hosts "$ASTERISK_DNS" 2>/dev/null | awk '{print $1}' | head -n 1 || echo "")

echo "[Router] IPs resueltas:"
echo "  Apache1:  $AP1_IP (DNS: $APACHE1_DNS)"
echo "  Apache2:  $AP2_IP (DNS: $APACHE2_DNS)"
echo "  Ingress:  $ING_IP (DNS: $INGRESS_DNS)"
[ -n "$AST_IP" ] && echo "  Asterisk: $AST_IP (DNS: $ASTERISK_DNS)"

# Validar que las IPs se resolvieron
if [ -z "$AP1_IP" ] || [ -z "$AP2_IP" ] || [ -z "$ING_IP" ]; then
  echo "[ERROR] No se pudieron resolver todos los DNSs. Verificar servicios en namespace 'privado' y 'publico'."
  sleep 5
  exit 1
fi

# ========================================
# Paso 4: Reglas NAT - DNAT en PREROUTING
# ========================================
echo "[Router] Configurando DNAT (PREROUTING)..."

# Puerto 8080 -> Apache1:80
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination ${AP1_IP}:80
echo "  8080/tcp -> ${AP1_IP}:80"

# Puerto 8081 -> Apache2:80
iptables -t nat -A PREROUTING -p tcp --dport 8081 -j DNAT --to-destination ${AP2_IP}:80
echo "  8081/tcp -> ${AP2_IP}:80"

# Puerto 80 -> Ingress:80
iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination ${ING_IP}:80
echo "  80/tcp -> ${ING_IP}:80"

# ========================================
# Paso 5: Reglas NAT - OUTPUT (para tráfico local)
# ========================================
# Esto es necesario para que localhost:8080 funcione correctamente
echo "[Router] Configurando DNAT (OUTPUT) para tráfico local..."

iptables -t nat -A OUTPUT -p tcp --dport 8080 -j DNAT --to-destination ${AP1_IP}:80
iptables -t nat -A OUTPUT -p tcp --dport 8081 -j DNAT --to-destination ${AP2_IP}:80
iptables -t nat -A OUTPUT -p tcp --dport 80 -j DNAT --to-destination ${ING_IP}:80

# ========================================
# Paso 6: Asterisk (si existe)
# ========================================
if [ -n "$AST_IP" ]; then
  echo "[Router] Configurando Asterisk..."
  iptables -t nat -A PREROUTING -p tcp --dport 5601 -j DNAT --to-destination ${AST_IP}:5060
  iptables -t nat -A PREROUTING -p udp --dport 5601 -j DNAT --to-destination ${AST_IP}:5060
  iptables -t nat -A OUTPUT -p tcp --dport 5601 -j DNAT --to-destination ${AST_IP}:5060
  iptables -t nat -A OUTPUT -p udp --dport 5601 -j DNAT --to-destination ${AST_IP}:5060
  echo "  5601/tcp,udp -> ${AST_IP}:5060"
fi

# ========================================
# Paso 7: SNAT/MASQUERADE en POSTROUTING
# ========================================
# Necesario para que las respuestas regresen correctamente
echo "[Router] Configurando SNAT (POSTROUTING)..."
iptables -t nat -A POSTROUTING -o eth0 -p tcp -d ${AP1_IP} --dport 80 -j MASQUERADE
iptables -t nat -A POSTROUTING -o eth0 -p tcp -d ${AP2_IP} --dport 80 -j MASQUERADE
iptables -t nat -A POSTROUTING -o eth0 -p tcp -d ${ING_IP} --dport 80 -j MASQUERADE

if [ -n "$AST_IP" ]; then
  iptables -t nat -A POSTROUTING -o eth0 -p tcp -d ${AST_IP} --dport 5060 -j MASQUERADE
  iptables -t nat -A POSTROUTING -o eth0 -p udp -d ${AST_IP} --dport 5060 -j MASQUERADE
fi

# Fallback para otros tráficos
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# ========================================
# Paso 8: Verificación
# ========================================
echo ""
echo "=== CONFIGURACIÓN FINAL ==="
echo ""
echo "=== Forwarding status ==="
cat /proc/sys/net/ipv4/ip_forward

echo ""
echo "=== NAT PREROUTING Rules ==="
iptables -t nat -L PREROUTING -n -v

echo ""
echo "=== NAT OUTPUT Rules ==="
iptables -t nat -L OUTPUT -n -v

echo ""
echo "=== NAT POSTROUTING Rules ==="
iptables -t nat -L POSTROUTING -n -v

echo ""
echo "[Router] ✓ Configuración completada. Contenedor listo."
echo "[Router] Escuchando en puerto 80, 8080, 8081, 5601..."
echo ""

# ========================================
# Mantener contenedor activo
# ========================================
exec tail -f /dev/null