"""
esg_backend/settings.py
-----------------------
Django's main configuration file.
WHY: We centralise all settings here — installed apps, database,
CORS (so React can talk to Django), and static files for deployment.
"""

import os
from pathlib import Path

# Try to load dotenv — graceful fallback if not installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed; use system environment variables

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY — keep secret key in .env in production
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-in-production')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']   # lock down to your domain in production

# ---------------------------------------------------------------------------
# INSTALLED APPS
# WHY: We add 'corsheaders' so Django sends CORS headers (lets React call APIs),
#      'rest_framework' gives us DRF, and 'records' is our custom app.
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',          # ← CORS support
    'rest_framework',       # ← Django REST Framework
    'records',              # ← our ESG app
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # ← must be FIRST
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ← serves static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'esg_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'esg_backend.wsgi.application'

# ---------------------------------------------------------------------------
# DATABASE
# WHY: SQLite for local dev (zero setup), PostgreSQL for production on Render.
#      We check the DATABASE_URL env variable — if set, use Postgres.
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    import dj_database_url
    DATABASES = {'default': dj_database_url.config(default=DATABASE_URL)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ---------------------------------------------------------------------------
# CORS SETTINGS
# WHY: React runs on localhost:5173, Django on localhost:8000.
#      Without CORS, the browser blocks the API calls. We allow all origins
#      in development; restrict to your Vercel URL in production.
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True   # change to False in production
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv('FRONTEND_URL', 'https://your-app.vercel.app'),
]

# ---------------------------------------------------------------------------
# REST FRAMEWORK
# WHY: Sets default response format to JSON, adds basic auth for admin use.
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',   # ← needed for file uploads
        'rest_framework.parsers.FormParser',
    ],
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files — WhiteNoise serves these on Render without a CDN
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (uploaded CSVs)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
