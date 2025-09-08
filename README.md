# peermsg — Local Peer-to-Peer Messenger (LAN/Wi-Fi)

A lightweight CLI messenger for **local networks (LAN/Wi-Fi)**.  
- 🛰️ Peer discovery (broadcast or multicast)  
- 💬 Real-time chat in named rooms  
- 🔒 AES-256-GCM encryption with a pre-shared key  
- 🖥️ Full-screen terminal UI (TUI)  
- 🌐 Works without servers, brokers, or persistence

> Install: `pnpm add -g peermsg`

---

## Install

```bash
pnpm add -g peermsg

## peermsg — Local Peer-to-Peer Messenger (LAN/Wi-Fi)

```
[![npm version](https://img.shields.io/npm/v/peermsg.svg?style=flat-square)](https://www.npmjs.com/package/peermsg)
[![npm downloads](https://img.shields.io/npm/dm/peermsg.svg?style=flat-square)](https://www.npmjs.com/package/peermsg)
[![license](https://img.shields.io/npm/l/peermsg.svg?style=flat-square)](./LICENSE)
[![Node.js Version](https://img.shields.io/node/v/peermsg.svg?style=flat-square)](https://nodejs.org)

![peermsg TUI Demo](docs/demo.png)
![peermsg demo](docs/demo.gif)


## Usage

```bash
peermsg join <room> [--name <nick>] [--key <psk>] [--tui] [--mc]
peermsg send <room> "<message>" [--key <psk>] [--mc]
peermsg peers <room> [--mc]

## Examples
📡 Broadcast (default
peermsg join devs --name Eddy

🌍 Multicast (recommended on many Wi-Fi networks)
peermsg join devs --name Hana --mc

🔐 Encrypted chat (AES-256-GCM with pre-shared key)
PEERMSG_KEY="lan-secret" peermsg join devs --name Jisoo

🖥 Full-screen terminal UI
peermsg join devs --name Lisa --tui

One-off message
peermsg send devs "Quick update: build passed ✅"


👥 List peers
peermsg peers devs

```bash
pnpm add -g peermsg

or with npm:

npm install -g peermsg

From PowerShell or cmd.exe:
peermsg join devs --name Eddy

Another terminal (same machine or LAN peer):
peermsg join devs --name Hana


