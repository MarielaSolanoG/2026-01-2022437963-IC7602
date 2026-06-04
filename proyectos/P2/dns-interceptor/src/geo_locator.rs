use serde::{Deserialize, Serialize};
use std::env;

#[derive(Deserialize, Debug)]
pub struct ResolveResult {
    #[serde(default)]
    pub exists: bool,
    #[serde(default)]
    pub healthy: bool,
    #[serde(default)]
    pub r#type: String, 
    #[serde(default)]
    pub ip: String,
    #[serde(default = "default_ttl")]
    pub ttl: u32,
}

fn default_ttl() -> u32 {
    300
}

#[derive(Serialize)]
struct DnsResolverRequest {
    data: String,
}

#[derive(Deserialize)]
struct DnsResolverResponse {
    data: String,
}

pub struct ApiClient {
    base_url: String,
    client: reqwest::blocking::Client,
}

impl ApiClient {
    pub fn new() -> Self {
        let mut url = env::var("DNS_API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
        if url.ends_with('/') {
            url.pop();
        }
        
        ApiClient {
            base_url: url,
            client: reqwest::blocking::Client::new(),
        }
    }

    pub fn exists(&self, domain: &str, client_ip: &str) -> Result<ResolveResult, Box<dyn std::error::Error>> {
        let url = format!("{}/api/exists", self.base_url);
        
        let response = self.client.get(&url)
            .query(&[("domain", domain), ("client_ip", client_ip)])
            .send()?
            .error_for_status()? 
            .json::<ResolveResult>()?;
            
        Ok(response)
    }

    pub fn dns_resolver(&self, raw_packet: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        
        let url = format!("{}/api/dns_resolver", self.base_url);
        
        let encoded = STANDARD.encode(raw_packet);
        let body = DnsResolverRequest { data: encoded };
        
        let response = self.client.post(&url)
            .json(&body)
            .send()?
            .error_for_status()?
            .json::<DnsResolverResponse>()?;
            
        let decoded = STANDARD.decode(response.data.trim())?;
        Ok(decoded)
    }
}