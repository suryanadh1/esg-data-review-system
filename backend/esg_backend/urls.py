"""
esg_backend/urls.py
-------------------
Root URL configuration.
WHY: This is Django's routing entry point. We prefix all our API
endpoints with /api/ to keep things clean and RESTful.
The admin panel is kept at /admin/ for convenience.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('records.urls')),    # ← all ESG API endpoints
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
