#!/usr/bin/env python3
"""GitHub Webhook 接收服务，用于自动部署"""

import hashlib
import hmac
import json
import os
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler

WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', 'your-webhook-secret')
DEPLOY_SCRIPT = '/app/deploy.sh'
DEPLOY_BRANCH = 'main'


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/webhook':
            self.send_response(404)
            self.end_headers()
            return

        # 读取请求体
        content_length = int(self.headers.get('Content-Length', 0))
        payload = self.rfile.read(content_length)

        # 验证签名
        signature = self.headers.get('X-Hub-Signature-256', '')
        if not self.verify_signature(payload, signature):
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b'Invalid signature')
            return

        # 解析 payload
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        # 检查是否是 push 到 main 分支
        ref = data.get('ref', '')
        if ref != f'refs/heads/{DEPLOY_BRANCH}':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(f'Ignored: not {DEPLOY_BRANCH} branch'.encode())
            return

        # 触发部署
        print(f"Deploying from {ref}...")
        subprocess.Popen([DEPLOY_SCRIPT], shell=True)

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Deployment triggered')

    def verify_signature(self, payload, signature):
        if not signature:
            return False
        expected = 'sha256=' + hmac.new(
            WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 9000), WebhookHandler)
    print('Webhook server listening on port 9000...')
    server.serve_forever()
