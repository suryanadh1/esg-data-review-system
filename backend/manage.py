#!/usr/bin/env python
"""
manage.py
---------
Django's command-line utility. You run all Django commands through this file.
Examples:
  python manage.py runserver       ← starts development server
  python manage.py migrate         ← applies database migrations
  python manage.py createsuperuser ← creates admin user
  python manage.py makemigrations  ← generates new migration files
"""

import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and "
            "your virtual environment is activated."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
