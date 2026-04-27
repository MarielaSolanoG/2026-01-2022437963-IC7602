package supabase

import (
	"bytes"  
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Representa un registro DNS en Supabase
type DnsRecord struct {
    ID      int    `json:"id,omitempty"`
	Domain  string `json:"domain"`
	Type    string `json:"type"`
	IPs     any    `json:"ips"`
	Healthy bool   `json:"healthy"`
}

// Struct para health check
type HealthCheck struct {
    ID            int    `json:"id,omitempty"`
    DnsRecordID   int    `json:"dns_record_id,omitempty"`
    CheckType     string `json:"check_type"`
    Timeout       int    `json:"timeout"`
    Retries       int    `json:"retries"`
    Interval      int    `json:"interval"`
    Path          string `json:"path"`
    ExpectedCodes any    `json:"expected_codes"`
}

// DnsRecord con health check incluido
type DnsRecordFull struct {
    ID          int          `json:"id,omitempty"`
    Domain      string       `json:"domain"`
    Type        string       `json:"type"`
    IPs         any          `json:"ips"`
    Healthy     bool         `json:"healthy"`
    HealthCheck *HealthCheck `json:"health_check,omitempty"`
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

// helper: construye la URL base de la tabla
func baseURL() string {
    return os.Getenv("SUPABASE_URL") + "/dns_records"
}

// helper: agrega los headers de autenticación a una request
func setHeaders(req *http.Request) {
    req.Header.Set("apikey", os.Getenv("SUPABASE_KEY"))
    req.Header.Set("Authorization", "Bearer "+os.Getenv("SUPABASE_KEY"))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Prefer", "return=representation")
}

// GET todos los registros
func GetAllRecords() ([]DnsRecordFull, error) {
    req, err := http.NewRequest("GET", baseURL(), nil)
    if err != nil {
        return nil, err
    }
    setHeaders(req)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)

    var records []DnsRecordFull
    if err := json.Unmarshal(body, &records); err != nil {
        return nil, err
    }

    // Para cada registro busca su health check en Supabase
    for i, r := range records {
        hcURL := fmt.Sprintf("%s/health_checks?dns_record_id=eq.%d&limit=1",
            os.Getenv("SUPABASE_URL"), r.ID)

        hcReq, _ := http.NewRequest("GET", hcURL, nil)
        setHeaders(hcReq)

        hcResp, err := http.DefaultClient.Do(hcReq)
        if err != nil {
            continue
        }
        defer hcResp.Body.Close()
        hcBody, _ := io.ReadAll(hcResp.Body)

        var hcs []HealthCheck
        if err := json.Unmarshal(hcBody, &hcs); err == nil && len(hcs) > 0 {
            records[i].HealthCheck = &hcs[0]
        }
    }

    return records, nil
}

// POST crear un registro
func CreateRecord(record DnsRecord) (*DnsRecord, error) {
    payload, err := json.Marshal(record)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("POST", baseURL(), bytes.NewBuffer(payload))
    if err != nil {
        return nil, err
    }
    setHeaders(req)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)

    // Supabase a veces devuelve array, a veces objeto
    // Intentamos array primero
    var created []DnsRecord
    if err := json.Unmarshal(body, &created); err == nil && len(created) > 0 {
        return &created[0], nil
    }

    // Si falla, intentamos objeto directo
    var single DnsRecord
    if err := json.Unmarshal(body, &single); err == nil && single.ID != 0 {
        return &single, nil
    }

    // Si ambos fallan, logueamos el body para debug
    return nil, fmt.Errorf("respuesta inesperada de Supabase: %s", string(body))
}

// PATCH actualizar un registro por ID
func UpdateRecord(id int, record DnsRecord) (*DnsRecord, error) {
    url := fmt.Sprintf("%s?id=eq.%d", baseURL(), id)

    payload, err := json.Marshal(record)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(payload))
    if err != nil {
        return nil, err
    }
    setHeaders(req)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)

    var updated []DnsRecord
    if err := json.Unmarshal(body, &updated); err != nil {
        return nil, err
    }
    if len(updated) == 0 {
        return nil, fmt.Errorf("registro no encontrado")
    }
    return &updated[0], nil
}

// DELETE eliminar un registro por ID
func DeleteRecord(id int) error {
    url := fmt.Sprintf("%s?id=eq.%d", baseURL(), id)

    req, err := http.NewRequest("DELETE", url, nil)
    if err != nil {
        return err
    }
    setHeaders(req)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 300 {
        body, _ := io.ReadAll(resp.Body)
        return fmt.Errorf("error de Supabase: %s", string(body))
    }
    return nil
}

// Struct para IP to Country
type IpCountry struct {
    ID          int    `json:"id,omitempty"`
    CIDR        string `json:"cidr"`
    CountryCode string `json:"country_code"`
    CountryName string `json:"country_name"`
}

func ipCountryURL() string {
    return os.Getenv("SUPABASE_URL") + "/ip_to_country"
}

func GetAllIpCountry() ([]IpCountry, error) {
    req, _ := http.NewRequest("GET", ipCountryURL(), nil)
    setHeaders(req)
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    var records []IpCountry
    json.Unmarshal(body, &records)
    return records, nil
}

func CreateIpCountry(record IpCountry) (*IpCountry, error) {
    payload, _ := json.Marshal(record)
    req, _ := http.NewRequest("POST", ipCountryURL(), bytes.NewBuffer(payload))
    setHeaders(req)
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    var created []IpCountry
    if err := json.Unmarshal(body, &created); err == nil && len(created) > 0 {
        return &created[0], nil
    }
    var single IpCountry
    json.Unmarshal(body, &single)
    return &single, nil
}

func UpdateIpCountry(id int, record IpCountry) (*IpCountry, error) {
    url := fmt.Sprintf("%s?id=eq.%d", ipCountryURL(), id)
    payload, _ := json.Marshal(record)
    req, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(payload))
    setHeaders(req)
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return nil, err }
    defer resp.Body.Close()
    body, _ := io.ReadAll(resp.Body)
    var updated []IpCountry
    if err := json.Unmarshal(body, &updated); err == nil && len(updated) > 0 {
        return &updated[0], nil
    }
    return nil, fmt.Errorf("no encontrado")
}

func DeleteIpCountry(id int) error {
    url := fmt.Sprintf("%s?id=eq.%d", ipCountryURL(), id)
    req, _ := http.NewRequest("DELETE", url, nil)
    setHeaders(req)
    resp, err := http.DefaultClient.Do(req)
    if err != nil { return err }
    defer resp.Body.Close()
    return nil
}

// PATCH actualizar health check por dns_record_id
func UpdateHealthCheck(dnsRecordID int, hc HealthCheck) error {
    url := fmt.Sprintf("%s/health_checks?dns_record_id=eq.%d",
        os.Getenv("SUPABASE_URL"), dnsRecordID)

    payload, _ := json.Marshal(hc)
    req, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(payload))
    setHeaders(req)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    return nil
}