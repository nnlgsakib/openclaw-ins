use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use tauri::Emitter;
use tokio::net::TcpStream;
use tokio::sync::{oneshot, Mutex as AsyncMutex};
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};

use crate::state::AppState;

#[allow(dead_code)]
type WsSink = futures::stream::SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;

/// Response from a Gateway WebSocket call.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayWsResponse {
    pub connected: bool,
}

/// Connect to the Gateway WebSocket at ws://127.0.0.1:{port}.
#[tauri::command]
pub async fn gateway_ws_connect(
    app: tauri::AppHandle,
    port: Option<u16>,
    state: tauri::State<'_, StdMutex<AppState>>,
) -> Result<GatewayWsResponse, String> {
    let port = port.unwrap_or(18789);
    let url = format!("ws://127.0.0.1:{port}");

    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to Gateway WebSocket at {url}: {e}"))?;

    let (write, read) = ws_stream.split();

    let write_handle = Arc::new(AsyncMutex::new(write));
    let pending: Arc<StdMutex<HashMap<String, oneshot::Sender<serde_json::Value>>>> =
        Arc::new(StdMutex::new(HashMap::new()));

    // Store in AppState
    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_ws_write = Some(write_handle.clone());
        app_state.gateway_ws_pending = Some(pending.clone());
    }

    // Spawn reader task
    let app_reader = app.clone();
    tokio::spawn(async move {
        let mut read = read;
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(id) = json.get("id").and_then(|v| v.as_str()) {
                            let mut p = pending.lock().unwrap();
                            if let Some(sender) = p.remove(id) {
                                let _ = sender.send(json);
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    let _ = app_reader.emit(
                        "gateway-ws-status",
                        serde_json::json!({ "connected": false, "error": null }),
                    );
                    break;
                }
                Err(e) => {
                    let _ = app_reader.emit(
                        "gateway-ws-status",
                        serde_json::json!({ "connected": false, "error": e.to_string() }),
                    );
                    break;
                }
                _ => {}
            }
        }

        let _ = app_reader.emit(
            "gateway-ws-status",
            serde_json::json!({ "connected": false, "error": null }),
        );
    });

    let _ = app.emit(
        "gateway-ws-status",
        serde_json::json!({ "connected": true, "error": null }),
    );

    Ok(GatewayWsResponse { connected: true })
}

/// Make a Gateway API call via WebSocket (JSON-RPC style).
#[tauri::command]
pub async fn gateway_ws_call(
    method: String,
    params: Option<serde_json::Value>,
    state: tauri::State<'_, StdMutex<AppState>>,
) -> Result<serde_json::Value, String> {
    let request_id = uuid::Uuid::new_v4().to_string();
    let params = params.unwrap_or(serde_json::json!({}));

    let message = serde_json::json!({
        "id": request_id,
        "method": method,
        "params": params,
    });

    // Get handles
    let (write_handle, pending) = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        let w = app_state
            .gateway_ws_write
            .as_ref()
            .ok_or("Gateway WebSocket not connected")?
            .clone();
        let p = app_state
            .gateway_ws_pending
            .as_ref()
            .ok_or("Gateway WebSocket not connected")?
            .clone();
        (w, p)
    };

    // Create response channel before sending
    let (tx, rx) = oneshot::channel::<serde_json::Value>();
    {
        let mut p = pending.lock().unwrap();
        p.insert(request_id, tx);
    }

    // Send message
    {
        let mut sink = write_handle.lock().await;
        sink.send(Message::Text(message.to_string().into()))
            .await
            .map_err(|e| format!("Failed to send WebSocket message: {e}"))?;
    }

    // Wait for response with timeout
    match tokio::time::timeout(std::time::Duration::from_secs(10), rx).await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(e)) => Err(format!("Response channel error: {e}")),
        Err(_) => Err("Gateway WebSocket call timed out after 10s".to_string()),
    }
}

/// Disconnect from the Gateway WebSocket.
#[tauri::command]
pub async fn gateway_ws_disconnect(
    app: tauri::AppHandle,
    state: tauri::State<'_, StdMutex<AppState>>,
) -> Result<(), String> {
    let write_handle = {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_ws_write.take()
    };

    if let Some(handle) = write_handle {
        let mut sink = handle.lock().await;
        let _ = sink.send(Message::Close(None)).await;
    }

    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_ws_pending.take();
    }

    let _ = app.emit(
        "gateway-ws-status",
        serde_json::json!({ "connected": false, "error": null }),
    );

    Ok(())
}
