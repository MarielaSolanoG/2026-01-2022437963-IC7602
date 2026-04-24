package supabase

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Representa un registro DNS en Supabase
type DnsRecord struct {
	ID      int    `json:"id"`
	Domain  string `json:"domain"`
	Type    string `json:"type"`
	IPs     any    `json:"ips"`
	Healthy bool   `json:"healthy"`
}

// Busca un dominio en Supabase. Devuelve si existe, el registro y un posible error
func GetRecord(domain string) (bool, *DnsRecord, error) {

	// Construye la URL filtrando por dominio
	url := fmt.Sprintf("%s/dns_records?domain=eq.%s&limit=1", os.Getenv("SUPABASE_URL"), domain)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, nil, err
	}

	// Headers requeridos por Supabase para autenticación
	req.Header.Set("apikey", os.Getenv("SUPABASE_KEY"))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("SUPABASE_KEY"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false, nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// Convierte el JSON de respuesta a una lista de DnsRecord
	var records []DnsRecord
	err = json.Unmarshal(body, &records)
	if err != nil {
		return false, nil, err
	}

	if len(records) == 0 {
		return false, nil, nil
	}

	return true, &records[0], nil
}