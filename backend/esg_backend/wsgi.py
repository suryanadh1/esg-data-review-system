"""
esg_backend/wsgi.py
-------------------
WSGI entry point — used by Gunicorn on Render to serve Django.
WHY: Render (and most Python hosts) use WSGI/ASGI to run Django apps.
     Gunicorn reads this file to know how to start the app.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
application = get_wsgi_application()
