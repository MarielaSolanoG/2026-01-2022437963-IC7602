package supabase

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/netip"
    "os"
    "sync"
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

///Cambios para el DNS Interceptor 


// IPEntry representa una IP dentro del campo JSONB "ips".
// No todos los tipos usan todos los campos.
type IPEntry struct {
    IP          string `json:"ip"`
    Weight      int    `json:"weight,omitempty"`
    CountryCode string `json:"country_code,omitempty"`
    Country     string `json:"country,omitempty"`
    Healthy     *bool  `json:"healthy,omitempty"`
    RTTMs       int    `json:"rtt_ms,omitempty"`
    LatencyMS   int    `json:"latency_ms,omitempty"`
}

// ResolveResponse es la respuesta simple que necesita el DNS Interceptor.
type ResolveResponse struct {
    Exists  bool       `json:"exists"`
    Healthy bool       `json:"healthy,omitempty"`
    Type    string     `json:"type,omitempty"`
    IP      string     `json:"ip,omitempty"`
    TTL     int        `json:"ttl,omitempty"`
    Record  *DnsRecord `json:"record,omitempty"`
}

var rrState = struct {
    sync.Mutex
    Counters map[string]int
}{Counters: map[string]int{}}

// ResolveRecord busca un dominio y devuelve la IP final que debe usar el Interceptor.
func ResolveRecord(domain string, clientIP string) (*ResolveResponse, error) {
    exists, record, err := GetRecord(domain)
    if err != nil {
        return nil, err
    }

    if !exists || record == nil {
        return &ResolveResponse{Exists: false}, nil
    }

    result := &ResolveResponse{
        Exists:  true,
        Healthy: record.Healthy,
        Type:    record.Type,
        TTL:     300,
        Record:  record,
    }

    // Si el registro está unhealthy, el Interceptor debe hacer fallback a /api/dns_resolver.
    if !record.Healthy {
        return result, nil
    }

    ips, err := normalizeIPEntries(record.IPs)
    if err != nil {
        // Si el formato de IPs está malo, no tiramos abajo el API.
        // Marcamos como unhealthy para que el Interceptor haga fallback.
        result.Healthy = false
        return result, nil
    }

    ips = onlyHealthyIPs(ips)
    if len(ips) == 0 {
        result.Healthy = false
        return result, nil
    }

    selected := selectIPForRecord(record.Type, domain, clientIP, ips)
    if selected.IP == "" {
        result.Healthy = false
        return result, nil
    }

    result.IP = selected.IP
    return result, nil
}

func normalizeIPEntries(raw any) ([]IPEntry, error) {
    if raw == nil {
        return nil, fmt.Errorf("el registro no tiene IPs")
    }

    b, err := json.Marshal(raw)
    if err != nil {
        return nil, err
    }

    var list []IPEntry
    if err := json.Unmarshal(b, &list); err == nil && len(list) > 0 {
        return list, nil
    }

    var single IPEntry
    if err := json.Unmarshal(b, &single); err == nil && single.IP != "" {
        return []IPEntry{single}, nil
    }

    return nil, fmt.Errorf("formato de ips inválido: %s", string(b))
}

func onlyHealthyIPs(ips []IPEntry) []IPEntry {
    result := make([]IPEntry, 0, len(ips))

    for _, ip := range ips {
        if ip.IP == "" {
            continue
        }

        // Si healthy no viene dentro de la IP, asumimos que esa IP está disponible.
        if ip.Healthy == nil || *ip.Healthy {
            result = append(result, ip)
        }
    }

    return result
}

func selectIPForRecord(recordType, domain, clientIP string, ips []IPEntry) IPEntry {
    switch recordType {
    case "single":
        return ips[0]

    case "multi":
        return roundRobin(domain+":multi", ips)

    case "weight":
        return weightedRoundRobin(domain+":weight", ips)

    case "geo":
        return selectGeo(clientIP, ips)

    case "round-trip":
        return selectLowestRTT(ips)

    default:
        // Fallback razonable si viene un tipo desconocido.
        return ips[0]
    }
}

func roundRobin(key string, ips []IPEntry) IPEntry {
    rrState.Lock()
    defer rrState.Unlock()

    index := rrState.Counters[key] % len(ips)
    rrState.Counters[key]++

    return ips[index]
}

func weightedRoundRobin(key string, ips []IPEntry) IPEntry {
    expanded := make([]IPEntry, 0)

    for _, ip := range ips {
        weight := ip.Weight
        if weight <= 0 {
            weight = 1
        }

        for i := 0; i < weight; i++ {
            expanded = append(expanded, ip)
        }
    }

    if len(expanded) == 0 {
        return ips[0]
    }

    return roundRobin(key, expanded)
}

func selectGeo(clientIP string, ips []IPEntry) IPEntry {
    countryCode, err := LookupCountryCode(clientIP)

    if err == nil && countryCode != "" {
        for _, ip := range ips {
            if ip.CountryCode == countryCode || ip.Country == countryCode {
                return ip
            }
        }
    }

    // Si no se encuentra país o no hay match, se devuelve una IP válida.
    return roundRobin("geo:fallback", ips)
}

func selectLowestRTT(ips []IPEntry) IPEntry {
    best := ips[0]
    bestRTT := getRTT(best)

    for _, ip := range ips[1:] {
        currentRTT := getRTT(ip)

        if bestRTT == 0 || (currentRTT > 0 && currentRTT < bestRTT) {
            best = ip
            bestRTT = currentRTT
        }
    }

    return best
}

func getRTT(ip IPEntry) int {
    if ip.RTTMs > 0 {
        return ip.RTTMs
    }

    return ip.LatencyMS
}

// LookupCountryCode intenta encontrar el país de una IP usando la tabla ip_to_country.
func LookupCountryCode(clientIP string) (string, error) {
    if clientIP == "" {
        return "", nil
    }

    addr, err := netip.ParseAddr(clientIP)
    if err != nil {
        return "", err
    }

    records, err := GetAllIpCountry()
    if err != nil {
        return "", err
    }

    for _, record := range records {
        prefix, err := netip.ParsePrefix(record.CIDR)
        if err != nil {
            continue
        }

        if prefix.Contains(addr) {
            return record.CountryCode, nil
        }
    }

    return "", nil
}