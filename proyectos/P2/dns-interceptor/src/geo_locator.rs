use std::env;
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct SupabaseGeoResponse {
    // Mapeamos exactamente la columna de tu esquema
    pub country_code: String,
}

pub struct GeoLocator {
    supabase_url: String,
    supabase_key: String,
}

impl GeoLocator {
    pub fn new() -> Self {
        GeoLocator {
            supabase_url: env::var("SUPABASE_URL").unwrap_or_default(),
            supabase_key: env::var("SUPABASE_KEY").unwrap_or_default(),
        }
    }

    /// Consulta en Supabase a qué país pertenece la IP de origen
    pub fn obtener_pais_por_ip(&self, client_ip: &str) -> String {
        if self.supabase_url.is_empty() || self.supabase_key.is_empty() {
            eprintln!("[GEO_ERROR] SUPABASE_URL o SUPABASE_KEY no configuradas en el entorno.");
            return "UNKNOWN".to_string();
        }

        let client = reqwest::blocking::Client::new();
        let base_url = self.supabase_url.trim_end_matches('/');

        // 1. Extraemos los dos primeros octetos de la IP (ej: de "200.200.5.1" a "200.200.%")
        let ip_parts: Vec<&str> = client_ip.split('.').collect();
        let ip_prefix = if ip_parts.len() >= 2 {
            format!("{}.{}.%", ip_parts[0], ip_parts[1])
        } else {
            format!("{}%", client_ip)
        };

        // 2. Usamos el operador 'like' para que calce con el inicio del texto en la columna 'cidr'
        let url = format!("{}/rest/v1/ip_to_country?cidr=like.{}", base_url, ip_prefix);

        let response = client.get(&url)
            .header("apikey", &self.supabase_key)
            .header("Authorization", format!("Bearer {}", self.supabase_key))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .send();

        match response {
            Ok(res) => {
                if !res.status().is_success() {
                    let status_code = res.status();
                    if let Ok(err_body) = res.text() {
                        eprintln!("[GEO_ERROR] Supabase respondió con código {}: {}", status_code, err_body);
                    } else {
                        eprintln!("[GEO_ERROR] Supabase respondió con código de error: {}", status_code);
                    }
                    return "UNKNOWN".to_string();
                }

                match res.json::<Vec<SupabaseGeoResponse>>() {
                    Ok(records) => {
                        if let Some(record) = records.first() {
                            return record.country_code.trim().to_uppercase();
                        }
                        println!("[GEO_WARNING] No se encontró ningún registro para la IP: {}", client_ip);
                        "UNKNOWN".to_string()
                    }
                    Err(e) => {
                        eprintln!("[GEO_ERROR] Error al deserializar JSON de Supabase: {}", e);
                        "UNKNOWN".to_string()
                    }
                }
            }
            Err(e) => {
                eprintln!("[GEO_ERROR] Error de conexión de red hacia Supabase: {}", e);
                "UNKNOWN".to_string()
            }
        }
    }

    pub fn obtener_ip_zonal_cache(&self, country_code: &str) -> String {
        match country_code {
            "CR" | "NI" | "PA" | "GT" | "HN" => {
                env::var("ZONAL_CACHE_LATAM_IP").unwrap_or_else(|_| "127.0.0.1".to_string())
            }
            "US" | "CA" | "MX" => {
                env::var("ZONAL_CACHE_USA_IP").unwrap_or_else(|_| "127.0.0.1".to_string())
            }
            _ => {
                let europa = env::var("ZONAL_CACHE_EUROPE_IP").unwrap_or_default();
                if europa.contains("svc") || europa.is_empty() {
                    "127.0.0.1".to_string()
                } else {
                    europa
                }
            }
        }
    }
}