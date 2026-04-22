package dns

import (
	"net"
	"time"
)

// Envía un paquete DNS por UDP al servidor remoto y devuelve la respuesta
func ForwardQuery(packet []byte, remoteServer string) ([]byte, error) {

	// Abre una conexión UDP al servidor DNS remoto (ej: 8.8.8.8:53)
	conn, err := net.DialTimeout("udp", remoteServer+":53", 5*time.Second)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	// Tiempo máximo de espera para enviar y recibir
	conn.SetDeadline(time.Now().Add(5 * time.Second))

	// Envía el paquete DNS
	_, err = conn.Write(packet)
	if err != nil {
		return nil, err
	}

	// Lee la respuesta (512 bytes es el tamaño estándar DNS por UDP)
	buf := make([]byte, 512)
	n, err := conn.Read(buf)
	if err != nil {
		return nil, err
	}

	return buf[:n], nil
}