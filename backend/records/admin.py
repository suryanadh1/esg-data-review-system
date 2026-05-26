"""
records/admin.py — UPGRADED
"""
from django.contrib import admin
from .models import ESGRecord, AuditLog


@admin.register(ESGRecord)
class ESGRecordAdmin(admin.ModelAdmin):
    list_display  = [
        'company_name', 'source_type', 'scope_category', 'year',
        'normalized_emissions', 'status', 'is_suspicious', 'created_by', 'uploaded_at'
    ]
    list_filter   = ['status', 'is_suspicious', 'source_type', 'scope_category', 'year']
    search_fields = ['company_name', 'source', 'created_by']
    readonly_fields = ['uploaded_at', 'reviewed_at', 'raw_data']
    ordering      = ['-uploaded_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ['record', 'action', 'performed_by', 'timestamp']
    list_filter   = ['action']
    search_fields = ['performed_by', 'record__company_name']
    readonly_fields = ['record', 'action', 'performed_by', 'timestamp',
                       'details', 'old_value', 'new_value']

    def has_add_permission(self, request):    return False
    def has_change_permission(self, request, obj=None): return False
