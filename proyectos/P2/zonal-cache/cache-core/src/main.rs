use axum::{routing::get, Router, extract::Query, response::IntoResponse, http::StatusCode};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use serde::Deserialize;

struct EntradaCache {
    ruta_en_disco: String,
    tamanio_bytes: u64,
}

type EstadoCache = Arc<Mutex<HashMap<String, EntradaCache>>>;

#[derive(Deserialize)]
struct Params {
    url: String,
}

async fn buscar_en_cache(
    Query(params): Query<Params>,
    axum::extract::State(cache): axum::extract::State<EstadoCache>,
) -> impl IntoResponse {
    let cache = cache.lock().unwrap();

    match cache.get(&params.url) {
        Some(entrada) => (
            StatusCode::OK,
            format!("HIT — archivo en: {} ({} bytes)", entrada.ruta_en_disco, entrada.tamanio_bytes)
        ),
        None => (
            StatusCode::NOT_FOUND,
            format!("MISS — {} no está en caché", params.url)
        ),
    }
}

#[tokio::main]
async fn main() {
    let mut mapa = HashMap::new();
    mapa.insert(
        String::from("http://example.com/foto.png"),
        EntradaCache {
            ruta_en_disco: String::from("/cache/foto.png"),
            tamanio_bytes: 2048,
        },
    );

    let cache: EstadoCache = Arc::new(Mutex::new(mapa));

    let app = Router::new()
        .route("/cache", get(buscar_en_cache))
        .with_state(cache);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Servidor corriendo en http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}