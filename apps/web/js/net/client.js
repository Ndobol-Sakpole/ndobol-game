import { apiUrl, roomUrl } from "./config.js";
import { walletSession } from "../wallet/auth.js";
import {
  isMessage,
  message,
  PROTOCOL_VERSION,
} from "../../../../shared/messages.js";
import { GAME } from "../../../../shared/game/config.js";
/** No score/position messages. Resume credentials stay in this tab's sessionStorage. */
export function createClient({
  onMessage = () => {},
  onStatus = () => {},
} = {}) {
  let socket,
    pending,
    retry,
    heartbeat,
    stopped = true,
    session = null,
    offset = 0,
    bestRtt = Infinity,
    rtt = 0,
    retryUntil = 0;
  try {
    session = JSON.parse(sessionStorage.getItem("ndobol-session"));
  } catch {
    /* storage may be disabled */
  }
  function save() {
    try {
      sessionStorage.setItem("ndobol-session", JSON.stringify(session));
    } catch {
      /* Connection can continue; automatic reload recovery is unavailable. */
    }
  }
  function send(type, payload = {}) {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message(type, payload)));
    return true;
  }
  function connect() {
    if (pending) return pending;
    if (socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    stopped = false;
    pending = new Promise((resolve, reject) => {
      const url = roomUrl();
      const connection = new WebSocket(url);
      socket = connection;
      let welcomed = false;
      const timeout = setTimeout(() => connection.close(), 5000);
      socket.onopen = () => send("hello", { protocol: PROTOCOL_VERSION, ...(walletSession()?.token ? { authToken: walletSession().token } : {}) });
      connection.onmessage = (event) => {
        if (socket !== connection) return;
        let m;
        try {
          m = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!isMessage(m, "server")) return;
        const p = m.payload;
        if (m.type === "welcome") {
          welcomed = true;
          clearTimeout(timeout);
          pending = null;
          offset = p.serverTime - Date.now();
          bestRtt = Infinity;
          onStatus(session ? "resuming" : "connected");
          if (session)
            send("resume", { code: session.code, token: session.token });
          send("ping", { clientTime: Date.now() });
          heartbeat = setInterval(
            () => send("ping", { clientTime: Date.now() }),
            3000,
          );
          resolve();
        }
        if (m.type === "pong") {
          rtt = Date.now() - p.clientTime;
          if (rtt < bestRtt) {
            bestRtt = rtt;
            offset = p.serverTime - (p.clientTime + rtt / 2);
          }
        }
        if (m.type === "joined") {
          session = p;
          save();
          retryUntil = 0;
          onStatus("connected");
        }
        if (m.type === "left") {
          session = null;
          save();
        }
        if (
          m.type === "error" &&
          [
            "INVALID_SESSION",
            "RECONNECT_EXPIRED",
            "ROOM_NOT_FOUND",
            "ROOM_EXPIRED",
            "SESSION_ACTIVE",
          ].includes(p.code)
        ) {
          session = null;
          save();
          onStatus("expired");
        }
        onMessage(m);
      };
      socket.onerror = () => {
        /* close handles network failure */
      };
      connection.onclose = () => {
        clearTimeout(timeout);
        if (socket !== connection) {
          if (!welcomed) reject(new Error("SERVER_UNAVAILABLE"));
          return;
        }
        clearInterval(heartbeat);
        pending = null;
        if (!welcomed) reject(new Error("SERVER_UNAVAILABLE"));
        if (stopped) return;
        if (session) {
          retryUntil ||= Date.now() + GAME.reconnectMs;
          if (Date.now() < retryUntil) {
            onStatus("reconnecting");
            retry = setTimeout(
              () => connect().catch(() => {}),
              GAME.resumeRetryMs,
            );
            return;
          }
          session = null;
          save();
          onStatus("expired");
        } else onStatus("offline");
      };
    });
    return pending;
  }
  return {
    connect,
    send,
    get session() {
      return session;
    },
    get serverNow() {
      return Date.now() + offset;
    },
    get rtt() {
      return rtt;
    },
    async result(roundId, create = true) {
      if (!session) throw new Error("NO_SESSION");
      const response = await fetch(
        create
          ? apiUrl("/rounds/sign")
          : apiUrl(`/rounds/result?roundId=${encodeURIComponent(roundId)}`),
        {
          method: create ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          ...(create
            ? { body: JSON.stringify({ roundId, playerId: session.playerId }) }
            : {}),
        },
      );
      const body = await response.json();
      if (response.status === 409 && create) return this.result(roundId, false);
      if (!response.ok) throw new Error(body.error || "SIGN_FAILED");
      return body;
    },
    close({ forget = false } = {}) {
      stopped = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      if (forget) {
        send("leave");
        session = null;
        save();
      }
      socket?.close();
      socket = null;
      pending = null;
    },
  };
}
