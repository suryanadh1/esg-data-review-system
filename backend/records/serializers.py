"""
records/serializers.py
----------------------
Serializers convert Django model instances ↔ JSON.
WHY DRF SERIALIZERS?
  They handle validation, type conversion, and nested data automatically.
  Think of them as Django forms — but for APIs.
"""

from rest_framework import serializers
from .models import ESGRecord, AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializes AuditLog entries.
    'record_company' is a custom read-only field so the frontend
    can display the company name without a second API call.
    """
    record_company = serializers.CharField(
        source='record.company_name', read_only=True
    )
    record_year = serializers.IntegerField(
        source='record.year', read_only=True
    )

    class Meta:
        model  = AuditLog
        fields = [
            'id', 'record', 'record_company', 'record_year',
            'action', 'performed_by', 'timestamp', 'details'
        ]


class ESGRecordSerializer(serializers.ModelSerializer):
    """
    Full serializer for ESGRecord — used in list and detail views.
    audit_logs is a nested reverse relation — shows all audit events
    for each record in one API response.
    """
    audit_logs = AuditLogSerializer(many=True, read_only=True)

    class Meta:
        model  = ESGRecord
        fields = [
            'id', 'company_name', 'source', 'year',
            'carbon_emissions', 'energy_consumption',
            'water_usage', 'employee_count',
            'status', 'is_suspicious', 'suspicious_reason',
            'uploaded_at', 'reviewed_at', 'reviewed_by', 'notes',
            'audit_logs',
        ]
        # These are set by backend logic, not user input
        read_only_fields = [
            'status', 'is_suspicious', 'suspicious_reason',
            'uploaded_at', 'reviewed_at', 'reviewed_by',
        ]


class ESGRecordListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the records LIST view.
    WHY SEPARATE? The list page shows 100s of records — including
    nested audit_logs for each would be very slow. We only send what
    the table needs.
    """
    class Meta:
        model  = ESGRecord
        fields = [
            'id', 'company_name', 'source', 'year',
            'carbon_emissions', 'energy_consumption', 'water_usage',
            'employee_count', 'status', 'is_suspicious',
            'suspicious_reason', 'uploaded_at',
        ]


class ReviewSerializer(serializers.Serializer):
    """
    Validates the request body when an analyst approves/rejects a record.
    WHY NOT ModelSerializer? We're not creating/updating the whole model —
    just taking a reviewer_name and optional notes from the request body.
    """
    reviewer_name = serializers.CharField(max_length=100)
    notes         = serializers.CharField(required=False, allow_blank=True, default='')
