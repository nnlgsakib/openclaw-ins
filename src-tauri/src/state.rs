use futures::stream::SplitSink;
use std::collections::HashMap;
use std::sync::{Arc, Mutex as StdMutex};
use tokio::net::TcpStream;
use tokio::sync::{oneshot, Mutex as AsyncMutex};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::MaybeTlsStream;

type WsSink = SplitSink<tokio_tungstenite::WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;
type PendingCalls = Arc<StdMutex<HashMap<String, oneshot::Sender<serde_json::Value>>>>;

/// Application state container registered with Tauri.
#[derive(Default)]
pub struct AppState {
    pub platform: String,
    pub gateway_pid: Option<u32>,
    pub gateway_ws_write: Option<Arc<AsyncMutex<WsSink>>>,
    pub gateway_ws_pending: Option<PendingCalls>,
}

impl std::fmt::Debug for AppState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppState")
            .field("platform", &self.platform)
            .field("gateway_pid", &self.gateway_pid)
            .field("gateway_ws_connected", &self.gateway_ws_write.is_some())
            .finish()
    }
}
