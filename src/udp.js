import dgram from "node:dgram";
import { BCAST_ADDR, PORT, VERSION, MC_ADDR, MC_TTL } from "./constants.js";
import { encryptStr } from "./crypto.js";

export function createSocket(opts = {}) {
    const {
        bind = true,
        mode = "bc",
        mcAddr = MC_ADDR,
        mcIface,
        ttl = MC_TTL,
    } = opts;

    const sock = dgram.createSocket({ type: "udp4", reuseAddr: true });

    sock.on("error", (err) => {
        console.error("UDP error:", err?.message || err);
    });

    //We always bind fo receive; ffor one-off send we may skip
    if (bind) {
        sock.bind(PORT, () => {
            if (mode === "bc") {
                try {
                    sock.setBroadcast(true);
                } catch { }
            } else {
                //The multicast receive: join the group
                try {
                    sock.addMembership(mcAddr, mcIface); //iface optional
                    sock.setMulticastTTL(ttl);
                    //Allow seeing our own packets (helpful for debugging);
                    try {
                        sock.setMulticastLoopback(true);
                    } catch { }
                } catch (e) {
                    console.error("multicast join failed:", e?.message || e);
                }
            }
        });
    } else {
        //Unbound sender socet (one-off) can stiil set mode-specific flags
        if (mode === "bc") {
            try {
                sock.setBroadcast(true);
            } catch { }
        } else {
            try {
                sock.setMulticastTTL(ttl);
                try {
                    sock.setMulticastLoopback(false);
                } catch { }
            } catch { }
        }
    }

    //convenience destination function
    sock._dest =
        mode === "bc"
            ? () => ({ host: BCAST_ADDR, port: PORT })
            : () => ({ host: mcAddr, port: PORT });

    return sock;
}

// NOTE: If key is provided and obj.type === "chat",
// we encapsulate it in an "enc" envelope with AES-GCM.

export function sendJSON(sock, obj, key) {
    let payload = obj;

    if (key && obj?.type === "chat") {
        const inner = JSON.stringify(obj);
        const enc = encryptStr(inner, key);
        payload = { v: VERSION, type: "enc", alg: "aes-256-gcm", ...enc };
    } else {
        payload = { v: VERSION, ...obj };
    }
    const buf = Buffer.from(JSON.stringify(payload));
    const { host, port } = sock._dest();
    sock.send(buf, 0, buf.length, port, host);
}
