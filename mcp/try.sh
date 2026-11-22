#!/usr/bin/env bash
# Talk to the server by hand: four requests in, four answers out (logs go to stderr).
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"by-hand","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_story","arguments":{"number":4}}}' \
 '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_story","arguments":{"number":9}}}' \
 | node mcp/stories-server.mjs
