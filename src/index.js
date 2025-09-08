#!/usr/bin/env node
import { cmdJoin, cmdSend, cmdPeers } from "./commands.js";

function help() {
    console.log(`
peermsg – Local Peer-to-Peer Messenger (LAN/Wi-Fi)

Usage:
  peermsg join  <room> [--name <nick>] [--key "<passphrase>"] [--tui] [--mc] [--maddr <ip>] [--miface <local-ip>] [--ttl <n>]
  peermsg send  <room> "<message>"      [--name <nick>] [--key "<passphrase>"] [--mc] [--maddr <ip>] [--miface <local-ip>] [--ttl <n>]
  peermsg peers <room> [--wait <ms>]    [--mc] [--maddr <ip>] [--miface <local-ip>] [--ttl <n>]

Options:
  --tui                Full-screen terminal UI (no extra deps)
  --mc                 Use multicast instead of broadcast
  --maddr <ip>         Multicast group (default 239.255.0.1)
  --miface <local-ip>  Local interface address to join on (optional)
  --ttl <n>            Multicast TTL/hops (default 1)
  --name <nick>        Display name
  --key "<passphrase>" Enable AES-256-GCM for chat (or set PEERMSG_KEY)
`);
}

function parseOpts(argv) {
    const opts = {};
    for (let i = 0; i < argv.length; i++) {
        const k = argv[i];
        if (k === "--name") opts.name = argv[++i];
        else if (k === "--wait") opts.wait = argv[++i];
        else if (k === "--key") opts.key = argv[++i];
        else if (k === "--tui") opts.tui = true;
        else if (k === "--mc") opts.mc = true;
        else if (k === "--maddr") opts.maddr = argv[++i];
        else if (k === "--miface") opts.miface = argv[++i];
        else if (k === "--ttl") opts.ttl = argv[++i];
    }
    return opts;
}

(async function main() {
    const [cmd, a, b] = process.argv.slice(2);
    const opts = parseOpts(process.argv.slice(2));

    switch (cmd) {
        case "join":
            if (!a) return help();
            return cmdJoin(a, opts);
        case "send":
            if (!a || !b) return help();
            return cmdSend(a, b, opts);
        case "peers":
            if (!a) return help();
            return cmdPeers(a, opts);
        default:
            return help();
    }
})();
