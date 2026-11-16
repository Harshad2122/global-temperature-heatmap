from __future__ import annotations

import argparse
import json
import logging
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data.json"


class HeatMapHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/data":
            try:
                payload = DATA_FILE.read_bytes()
                json.loads(payload)
            except (OSError, json.JSONDecodeError) as error:
                logging.exception("Unable to load the heat-map dataset")
                self.send_error(500, f"Unable to load the heat-map dataset: {error}")
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()


def main():
    parser = argparse.ArgumentParser(description="Serve the global temperature heat map.")
    parser.add_argument("--host", default="127.0.0.1", help="Interface to bind to (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), HeatMapHandler)
    print(f"Heat map available at http://{args.host}:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping heat map server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
