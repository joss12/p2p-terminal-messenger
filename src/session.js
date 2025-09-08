import { createSocket, sendJSON } from "./udp.js";
import { HELLO_INTERVAL_MS, PEER_TTL_MS } from "./constants.js";
import { uuid, now, logLine } from "./utils.js";
import { decryptStr } from "./crypto.js";

/**
 * startSession({ room, name, key, transport })
 * transport: { mode: "bc"|"mc", mcAddr?, mcIface?, ttl? }
 */
export function startSession({
    room,
    name,
    key,
    transport = {},
    interactiveStdin = true,
    handlers = {},
}) {
    const id = uuid();
    const peers = new Map(); // id -> { name, last, ip }
    const sock = createSocket({ bind: true, ...transport });

    const announce = () =>
        sendJSON(sock, { type: "hello", room, id, name, ts: now() }, null);
    const who = () =>
        sendJSON(sock, { type: "who", room, id, name, ts: now() }, null);

    const emitPeers = () => {
        if (handlers.onPeers) {
            const arr = Array.from(peers.values()).map((p) => ({
                name: p.name,
                ip: p.ip,
            }));
            handlers.onPeers(arr);
        }
    };

    sock.on("message", (msg, rinfo) => {
        let data;
        try {
            data = JSON.parse(msg.toString("utf8"));
        } catch {
            return;
        }
        if (!data) return;

        if (data.type === "enc" && key) {
            const pt = decryptStr(data, key);
            if (!pt) return;
            try {
                data = JSON.parse(pt);
            } catch {
                return;
            }
        }

        if (!data.room || data.room !== room) return;
        if (data.id === id) return;

        switch (data.type) {
            case "hello":
                peers.set(data.id, {
                    name: data.name || "anon",
                    last: now(),
                    ip: rinfo.address,
                });
                emitPeers();
                break;
            case "who":
                announce();
                break;
            case "chat": {
                const from = data.name || "anon";
                const text = String(data.text ?? "");
                peers.set(data.id, { name: from, last: now(), ip: rinfo.address });
                if (handlers.onChat)
                    handlers.onChat({ from, text, ts: data.ts || now() });
                else logLine(`[${from}@${room}] ${text}`);
                emitPeers();
                break;
            }
            default:
                break;
        }
    });

    const helloTimer = setInterval(announce, HELLO_INTERVAL_MS);
    const gc = setInterval(() => {
        const t = now();
        let changed = false;
        for (const [pid, p] of peers)
            if (t - p.last > PEER_TTL_MS) {
                peers.delete(pid);
                changed = true;
            }
        if (changed) emitPeers();
    }, 5_000);

    announce();
    who();

    // Optional stdin handler (non-TUI mode)
    if (interactiveStdin) {
        process.stdin.setEncoding("utf8");
        process.stdin.resume();
        process.stdin.on("data", (chunk) => {
            const lines = chunk.split(/\r?\n/).filter(Boolean);
            for (const text of lines) {
                send(text);
                logLine(`[me@${room}] ${text}`);
                if (process.stdin.isTTY) process.stdout.write("> ");
            }
        });
        if (process.stdin.isTTY) process.stdout.write("> ");
    }

    function send(text) {
        sendJSON(
            sock,
            { type: "chat", room, id, name, ts: now(), text },
            key || null,
        );
    }

    const stop = () => {
        clearInterval(helloTimer);
        clearInterval(gc);
        try {
            sock.close();
        } catch { }
    };

    // expose helpers + assignable handlers (TUI can set these after creation)
    return {
        stop,
        send,
        peers,
        id,
        name,
        room,
        sock,
        onChat: null,
        onPeers: null,
    };
}
