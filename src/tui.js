// src/tui.js
import readline from "node:readline";

// Tiny renderer with no deps. Left: messages. Right: peers. Bottom: input.
export function runTui({ room, name, session, onExit }) {
    const state = {
        msgs: [], // {from, text, ts}
        peers: [], // [{name, ip}]
        scroll: 0, // 0 = bottom
        input: "",
    };

    // Wire session handlers
    session.onChat = (m) => {
        state.msgs.push(m);
        if (state.scroll === 0) ensureMax(state.msgs, 300);
        draw();
    };
    session.onPeers = (peersArr) => {
        state.peers = peersArr;
        draw();
    };

    // Terminal setup
    const tty = process.stdin.isTTY && process.stdout.isTTY;
    if (!tty) {
        console.error(
            "TUI requires a TTY (interactive terminal). Try without --tui.",
        );
        onExit?.();
        return;
    }
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    const cleanup = () => {
        // reset terminal
        write("\x1b[?25h"); // show cursor
        write("\x1b[0m"); // reset colors
        write("\x1b[2J\x1b[H"); // clear
        process.stdin.setRawMode(false);
    };

    const exitAll = () => {
        cleanup();
        onExit?.();
    };

    process.on("SIGINT", () => exitAll());
    process.on("SIGTERM", () => exitAll());

    process.stdin.on("keypress", (_str, key) => {
        if (!key) return;
        if (key.ctrl && key.name === "c") return exitAll();
        if (key.name === "escape") return exitAll();

        switch (key.name) {
            case "return":
            case "enter": {
                const text = state.input.trim();
                if (text) {
                    session.send(text);
                    state.input = "";
                }
                break;
            }
            case "backspace":
            case "delete":
                state.input = state.input.slice(0, -1);
                break;
            case "up":
                state.scroll = Math.min(
                    state.scroll + 1,
                    Math.max(0, state.msgs.length - 1),
                );
                break;
            case "down":
                state.scroll = Math.max(0, state.scroll - 1);
                break;
            case "pageup":
                state.scroll = Math.min(
                    state.scroll + 10,
                    Math.max(0, state.msgs.length - 1),
                );
                break;
            case "pagedown":
                state.scroll = Math.max(0, state.scroll - 10);
                break;
            case "home":
                state.scroll = Math.max(0, state.msgs.length - 1);
                break;
            case "end":
                state.scroll = 0;
                break;
            default:
                if (key.sequence && !key.ctrl && !key.meta) {
                    state.input += key.sequence;
                }
        }
        draw();
    });

    function write(s) {
        process.stdout.write(s);
    }

    function ensureMax(arr, max) {
        if (arr.length > max) arr.splice(0, arr.length - max);
    }

    function pad(str, n) {
        if (str.length >= n) return str.slice(0, n);
        return str + " ".repeat(n - str.length);
    }

    function draw() {
        const cols = process.stdout.columns || 100;
        const rows = process.stdout.rows || 30;

        const inputHeight = 3; // 1 line prompt + padding
        const headerHeight = 2;
        const footerHeight = 1;

        const bodyRows = Math.max(
            3,
            rows - inputHeight - headerHeight - footerHeight,
        );
        const peersWidth = Math.max(18, Math.floor(cols * 0.24));
        const msgsWidth = Math.max(20, cols - peersWidth - 3);

        // compute visible slice from bottom with scroll offset
        const visibleCount = bodyRows - 2; // minus inner paddings
        const end = state.msgs.length - state.scroll;
        const start = Math.max(0, end - visibleCount);
        const visible = state.msgs.slice(start, end);

        // clear & home
        write("\x1b[?25l"); // hide cursor
        write("\x1b[2J\x1b[H"); // clear screen

        // Header
        write(color(36, ` peermsg — room: ${room}  as: ${name} `) + "\n");
        write(
            dim(" ↑/↓ scroll  PgUp/PgDn faster  Enter send  Esc/Ctrl+C quit ") + "\n",
        );

        // Body frame
        // Left box: messages
        write("┌" + "─".repeat(msgsWidth) + "┬" + "─".repeat(peersWidth) + "┐\n");

        // message lines
        for (let i = 0; i < visibleCount; i++) {
            const m = visible[i];
            const line = m ? formatMsg(m, msgsWidth) : " ".repeat(msgsWidth);
            const peerLine = state.peers[i]
                ? pad(state.peers[i].name, peersWidth)
                : " ".repeat(peersWidth);
            write("│" + line + "│" + dim(peerLine) + "│\n");
        }

        write("└" + "─".repeat(msgsWidth) + "┴" + "─".repeat(peersWidth) + "┘\n");

        // Input
        const prompt = color(33, "> ") + state.input;
        const trimmed = prompt.length > cols ? prompt.slice(-cols) : prompt;
        write(trimmed + "\n");

        // Footer
        const info = dim(
            ` msgs:${state.msgs.length} peers:${state.peers.length} ` +
            (state.scroll ? ` [scrolled ${state.scroll}] ` : ""),
        );
        write(info);

        // position cursor at end of input
        write("\x1b[" + (rows - footerHeight) + ";1H"); // go to input line start
        write("\x1b[" + (trimmed.length + 1) + "G"); // move to after text
        write("\x1b[?25h"); // show cursor
    }

    function formatMsg(m, width) {
        const prefix = `[${m.from}] `;
        const space = Math.max(0, width - prefix.length);
        const text =
            m.text.length > space ? m.text.slice(0, space - 1) + "…" : m.text;
        return color(32, prefix) + text.padEnd(space, " ");
    }

    function color(code, s) {
        return `\x1b[${code}m${s}\x1b[0m`;
    }
    function dim(s) {
        return `\x1b[2m${s}\x1b[0m`;
    }

    // Initial paint
    draw();

    return { exit: exitAll };
}
