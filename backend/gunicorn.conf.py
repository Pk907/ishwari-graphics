import os

# Gunicorn configuration for production deployment (Render)
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '60'))
keepalive = int(os.environ.get('GUNICORN_KEEPALIVE', '2'))

# Logging to stdout/stderr for Render logs
accesslog = '-'
errorlog = '-'
capture_output = True
