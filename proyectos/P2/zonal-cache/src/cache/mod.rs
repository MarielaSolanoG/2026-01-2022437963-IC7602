use axum::response::IntoResponse;

pub async fn cache_handler() -> impl IntoResponse {
    "Auth OK. Pendiente motor de caché Persona 2."
}