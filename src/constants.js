export const PORT = 45454; //single UDP port for all rooms
export const BCAST_ADDR = "255.255.255.255"; // LAN broadcast target

//Multicast defaults
export const MC_ADDR = "239.255.0.1"; // administratively scoped multicast
export const MC_TTL = 1; //Stay on local network by default

export const HELLO_INTERVAL_MS = 5_000; //presence re-announce
export const PEER_TTL_MS = 20_000; //stale peer eviction
export const VERSION = 1;
