#!/bin/sh
# Fix ownership of volume-mounted directories so appuser can write to them,
# then drop privileges and start the app.
chown -R appuser:appgroup /data /photos
exec su-exec appuser node server.js
