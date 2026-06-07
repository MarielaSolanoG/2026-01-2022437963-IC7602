use axum::{
    extract::Query,
    response::IntoResponse,
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CacheParams {
    url: Option<String>,
}

pub async fn cache_handler(
    Query(params): Query<CacheParams>,
) -> impl IntoResponse {
    println!("Entrando al cache_handler");

    let url = params
        .url
        .unwrap_or_else(|| "https://httpbin.org/ip".to_string());

    crate::cache_core::get_cache(url).await
}