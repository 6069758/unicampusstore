#!/usr/bin/env python3
"""
Multi-threaded Local Static HTTP Server for Campus Store
Handles concurrent web traffic, assets, and ZIP binary downloads seamlessly.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CampusStoreRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for seamless live testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.zip'):
            return 'application/zip'
        if path.endswith('.js'):
            return 'text/javascript'
        if path.endswith('.css'):
            return 'text/css'
        if path.endswith('.html'):
            return 'text/html; charset=utf-8'
        return super().guess_type(path)

    def do_GET(self):
        if self.path.split('?')[0].endswith('.zip'):
            zip_file = os.path.join(DIRECTORY, 'campus_store_website.zip')
            if os.path.exists(zip_file):
                file_size = os.path.getsize(zip_file)
                self.send_response(200)
                self.send_header('Content-Type', 'application/zip')
                self.send_header('Content-Disposition', 'attachment; filename="campus_store_website.zip"')
                self.send_header('Content-Length', str(file_size))
                self.end_headers()
                with open(zip_file, 'rb') as f:
                    while chunk := f.read(65536):
                        self.wfile.write(chunk)
                return
        return super().do_GET()

def run():
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadingHTTPServer(server_address, CampusStoreRequestHandler)
    print(f"🚀 Campus Store multi-threaded server running on http://0.0.0.0:{PORT}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run()
