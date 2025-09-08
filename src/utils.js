import os from "node:os";

export const now = () => Date.now();

export function uuid() {
    return (
        Math.random().toString(36).slice(2) +
        "-" +
        process.pid +
        "-" +
        now().toString(36)
    );
}

export function localAddrs() {
    const out = [];
    for (const list of Object.value(os.networkInterfaces())) {
        for (const it of list || [])
            if (it.family === "IPv4" && !it.internal) out.push(it.address);
    }
    return out;
}

export function logLine(s) {
    process.stdout.write(s + "\n");
}
