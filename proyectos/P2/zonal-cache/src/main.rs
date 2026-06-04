mod firebase;
use firebase::config::load_config;

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    routing::get,
    Router,
};
use std::env;

async fn validate_api_key(request: Request, next: Next) -> Result<Response, StatusCode> {
    let config = load_config();

    if config.auth_type == "none" {
        return Ok(next.run(request).await);
    }

    if config.auth_type == "api_key" {
        let api_key = request
            .headers()
            .get("x-api-key")
            .and_then(|v| v.to_str().ok());

        return match api_key {
            Some(key) if key == config.api_key => Ok(next.run(request).await),
            _ => Err(StatusCode::UNAUTHORIZED),
        };
    }

    Err(StatusCode::UNAUTHORIZED)
}

async fn protected_resource() -> &'static str {
    "Acceso permitido según config.json"
}



#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let address = format!("0.0.0.0:{}", port);

    let app = Router::new()
        .route("/", get(protected_resource))
        .layer(middleware::from_fn(validate_api_key));

    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .unwrap();

    println!("Servidor iniciado en http://localhost:{}", port);

    axum::serve(listener, app).await.unwrap();
}