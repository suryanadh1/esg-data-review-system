"""
records/serializers.py — UPGRADED
-----------------------------------
CHANGES FROM v1:
  + New fields: source_type, scope_category, activity_type, normalized_emissions,
                original_source_file, created_by, raw_data
  + FlagSerializer for the flag action
  + AuditLog serializer includes old_value/new_value
"""

from rest_framework import serializers
from .models import ESGRecord, AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    record_company = serializers.CharField(source='record.company_name', read_only=True)
    record_year    = serializers.IntegerField(source='record.year', read_only=True)
    record_source_type = serializers.CharField(source='record.source_type', read_only=True)

    class Meta:
        model  = AuditLog
        fields = [
            'id', 'record', 'record_company', 'record_year', 'record_source_type',
            'action', 'performed_by', 'timestamp', 'details',
            'old_value', 'new_value',
        ]


class ESGRecordSerializer(serializers.ModelSerializer):
    """Full detail serializer — includes audit trail."""
    audit_logs             = AuditLogSerializer(many=True, read_only=True)
    scope_category_display = serializers.CharField(
        source='get_scope_category_display', read_only=True
    )
    source_type_display    = serializers.CharField(
        source='get_source_type_display', read_only=True
    )

    class Meta:
        model  = ESGRecord
        fields = [
            'id', 'company_name', 'source', 'source_type', 'source_type_display',
            'scope_category', 'scope_category_display', 'activity_type',
            'year', 'normalized_emissions',
            'carbon_emissions', 'energy_consumption', 'water_usage', 'employee_count',
            'raw_data',
            'status', 'is_suspicious', 'suspicious_reason',
            'original_source_file', 'created_by',
            'uploaded_at', 'reviewed_at', 'reviewed_by', 'notes',
            'audit_logs',
        ]
        read_only_fields = [
            'status', 'is_suspicious', 'suspicious_reason',
            'uploaded_at', 'reviewed_at', 'reviewed_by',
            'source_type', 'scope_category', 'activity_type',
            'normalized_emissions', 'raw_data',
        ]


class ESGRecordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the list view — no nested audit_logs."""
    scope_category_display = serializers.CharField(
        source='get_scope_category_display', read_only=True
    )
    source_type_display = serializers.CharField(
        source='get_source_type_display', read_only=True
    )

    class Meta:
        model  = ESGRecord
        fields = [
            'id', 'company_name', 'source', 'source_type', 'source_type_display',
            'scope_category', 'scope_category_display', 'activity_type',
            'year', 'normalized_emissions',
            'carbon_emissions', 'energy_consumption', 'water_usage', 'employee_count',
            'status', 'is_suspicious', 'suspicious_reason',
            'created_by', 'uploaded_at',
        ]


class ReviewSerializer(serializers.Serializer):
    """Used for approve / reject / flag actions."""
    reviewer_name = serializers.CharField(max_length=100)
    notes         = serializers.CharField(required=False, allow_blank=True, default='')


class FlagSerializer(serializers.Serializer):
    """Used for the manual-flag action."""
    reviewer_name = serializers.CharField(max_length=100)
    flag_reason   = serializers.CharField(min_length=5,
                                          help_text="Must explain WHY this record is being flagged.")
