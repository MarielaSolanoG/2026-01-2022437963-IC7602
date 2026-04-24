package dns

import (
	"testing"
)

func TestForwardQuery_ValidPacket(t *testing.T) {
	// Paquete DNS válido para consultar google.com tipo A
	// Generado con: python -c "import dns.message, base64; q = dns.message.make_query('google.com', 'A'); print(base64.b64encode(q.to_wire()).decode())"
	packet := []byte{
		0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x06, 0x67, 0x6f, 0x6f,
		0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00,
		0x00, 0x01, 0x00, 0x01,
	}

	response, err := ForwardQuery(packet, "8.8.8.8")

	if err != nil {
		t.Errorf("no se esperaba un error: %v", err)
	}
	if len(response) == 0 {
		t.Errorf("se esperaba una respuesta no vacía")
	}
}

func TestForwardQuery_InvalidServer(t *testing.T) {
	packet := []byte{0x00, 0x01}

	_, err := ForwardQuery(packet, "servidor-invalido")

	if err == nil {
		t.Errorf("se esperaba un error con servidor inválido")
	}
}