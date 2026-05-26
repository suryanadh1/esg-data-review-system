"""
records/admin.py
----------------
Registers models with Django's built-in admin panel.
WHY: The admin gives us a free CRUD UI — useful for quickly
inspecting data during development without building a frontend first.
"""

from django.contrib import admin
from .models import ESGRecord, AuditLog


@admin.register(ESGRecord)
class ESGRecordAdmin(admin.ModelAdmin):
    list_display  = [
        'company_name', 'year', 'source', 'status',
        'is_suspicious', 'carbon_emissions', 'uploaded_at'
    ]
    list_filter   = ['status', 'is_suspicious', 'source', 'year']
    search_fields = ['company_name', 'source']
    readonly_fields = ['uploaded_at', 'reviewed_at']
    ordering      = ['-uploaded_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ['record', 'action', 'performed_by', 'timestamp']
    list_filter   = ['action']
    search_fields = ['performed_by', 'record__company_name']
    readonly_fields = ['record', 'action', 'performed_by', 'timestamp', 'details']

    # WHY readonly_fields: Audit logs must never be edited.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
