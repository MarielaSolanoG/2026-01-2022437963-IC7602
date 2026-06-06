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

    /// Consulta en Supabase a qué país pertenece la IP de origen usando RPC
    pub fn obtener_pais_por_ip(&self, client_ip: &str) -> String {
        if self.supabase_url.is_empty() || self.supabase_key.is_empty() {
            eprintln!("[GEO_ERROR] SUPABASE_URL o SUPABASE_KEY no configuradas en el entorno.");
            return "UNKNOWN".to_string();
        }

        let client = reqwest::blocking::Client::new();
        let base_url = self.supabase_url.trim_end_matches('/');
        
        // La ruta para ejecutar funciones almacenadas en Supabase (RPC)
        let url = format!("{}/rest/v1/rpc/buscar_pais", base_url);

        // Construimos el JSON con el parámetro exacto que espera la función SQL
        let json_body = serde_json::json!({
            "client_ip": client_ip
        });

        // Usamos POST para invocar el RPC enviando el cuerpo estructurado
        let response = client.post(&url)
            .header("apikey", &self.supabase_key)
            .header("Authorization", format!("Bearer {}", self.supabase_key))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .json(&json_body)
            .send();

        match response {
            Ok(res) => {
                if !res.status().is_success() {
                    let status_code = res.status();
                    if let Ok(err_body) = res.text() {
                        eprintln!("[GEO_ERROR] Supabase RPC respondió con código {}: {}", status_code, err_body);
                    } else {
                        eprintln!("[GEO_ERROR] Supabase RPC respondió con código de error: {}", status_code);
                    }
                    return "UNKNOWN".to_string();
                }

                // Las funciones RPC que devuelven tablas retornan un arreglo JSON estándar
                match res.json::<Vec<SupabaseGeoResponse>>() {
                    Ok(records) => {
                        if let Some(record) = records.first() {
                            return record.country_code.trim().to_uppercase();
                        }
                        println!("[GEO_WARNING] RPC no devolvió filas para la IP: {}", client_ip);
                        "UNKNOWN".to_string()
                    }
                    Err(e) => {
                        eprintln!("[GEO_ERROR] Error al deserializar JSON de la RPC: {}", e);
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