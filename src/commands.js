// src/commands.js
import { createSocket, sendJSON } from "./udp.js";
import { startSession } from "./session.js";
import { now, logLine } from "./utils.js";
import { deriveKey } from "./crypto.js";
import { MC_ADDR, MC_TTL } from "./constants.js";
import { runTui } from "./tui.js";

function getKey(opts) {
    const pass = opts.key || process.env.PEERMSG_KEY;
    return pass ? deriveKey(pass) : null;
}

function transportFromOpts(opts) {
    if (!opts.mc) return { mode: "bc" };
    return {
        mode: "mc",
        mcAddr: opts.maddr || MC_ADDR,
        mcIface: opts.miface,
        ttl: opts.ttl ? Number(opts.ttl) : MC_TTL,
    };
}

export async function cmdJoin(room, opts) {
    const name = opts.name || process.env.USER || "anon";
    const key = getKey(opts);
    const transport = transportFromOpts(opts);

    if (opts.tui) {
        // TUI mode
        if (key) logLine("peermsg: encryption ON (AES-256-GCM).");
        logLine(
            `peermsg: transport = ${transport.mode === "mc" ? `multicast(${transport.mcAddr}, ttl=${transport.ttl}${transport.mcIface ? `, iface=${transport.mcIface}` : ""})` : "broadcast"}`,
        );
        const session = startSession({
            room,
            name,
            key,
            transport,
            interactiveStdin: false, // TUI owns stdin
            handlers: {}, // TUI will set them later
        });
        const ui = runTui({
            room,
            name,
            session,
            onExit: () => {
                session.stop();
                process.exit(0);
            },
        });
        // nothing else to do; TUI runs until exit
        return ui;
    }

    // Plain CLI mode
    if (key) logLine("peermsg: encryption ON (AES-256-GCM).");
    logLine(
        `peermsg: transport = ${transport.mode === "mc" ? `multicast(${transport.mcAddr}, ttl=${transport.ttl}${transport.mcIface ? `, iface=${transport.mcIface}` : ""})` : "broadcast"}`,
    );
    logLine(
        `peermsg: joined "${room}" as "${name}" — type to chat, Ctrl+C to exit.`,
    );

    const sess = startSession({
        room,
        name,
        key,
        transport,
        interactiveStdin: true,
    });

    const bye = () => {
        logLine("\npeermsg: bye.");
        sess.stop();
        process.exit(0);
    };
    process.on("SIGINT", bye);
    process.on("SIGTERM", bye);
}

export async function cmdSend(room, message, opts) {
    const name = opts.name || process.env.USER || "anon";
    const key = getKey(opts);
    const transport = transportFromOpts(opts);
    const sock = createSocket({ bind: false, ...transport });
    sendJSON(
        sock,
        { type: "chat", room, id: "oneoff", name, ts: now(), text: message },
        key,
    );
    setTimeout(() => {
        try {
            sock.close();
        } catch { }
    }, 50);
}

export async function cmdPeers(room, opts) {
    const transport = transportFromOpts(opts);
    const sock = createSocket({ bind: true, ...transport });
    const seen = new Map();
    const deadline = Date.now() + (opts.wait ? Number(opts.wait) : 1200);

    sock.on("message", (msg, rinfo) => {
        let data;
        try {
            data = JSON.parse(msg.toString("utf8"));
        } catch {
            return;
        }
        if (!data || data.room !== room) return;
        if (data.type === "hello")
            seen.set(data.id, { name: data.name || "anon", ip: rinfo.address });
    });

    sendJSON(sock, { type: "who", room, id: "probe", ts: now() }, null);

    const tick = setInterval(() => {
        if (Date.now() >= deadline) {
            clearInterval(tick);
            try {
                sock.close();
            } catch { }
            if (seen.size === 0) logLine(`No peers in "${room}".`);
            else {
                logLine(`Peers in "${room}":`);
                for (const { name, ip } of seen.values()) logLine(`• ${name} @ ${ip}`);
            }
        }
    }, 100);
}
