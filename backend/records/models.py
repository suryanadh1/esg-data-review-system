"""
records/models.py  — UPGRADED
-------------------------------
CHANGES FROM v1:
  + source_type field  (sap_fuel | utility_electricity | corporate_travel | generic)
  + scope_category     (scope_1 | scope_2 | scope_3)
  + activity_type      (fuel_combustion | electricity_consumption | business_travel | general)
  + normalized_emissions (CO₂e in metric tons — unified unit across all sources)
  + original_source_file (filename of the uploaded CSV)
  + created_by         (name of analyst who uploaded)
  + STATUS_FLAGGED     ('flagged') — analyst-initiated flag, separate from system suspicious
  + AuditLog.ACTION_FLAGGED

WHY BACKWARD COMPATIBLE?
  All new fields have defaults — existing records in the DB are not affected.
  Migration adds columns with default values, zero downtime.
"""

from django.db import models
from django.utils import timezone


class ESGRecord(models.Model):

    # ── Status choices ──────────────────────────────────────────────────────
    STATUS_PENDING  = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_FLAGGED  = 'flagged'      # ← NEW: analyst manually flags for attention
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_FLAGGED,  'Flagged'),
    ]

    # ── Source type choices ─────────────────────────────────────────────────
    SOURCE_SAP_FUEL  = 'sap_fuel'
    SOURCE_UTILITY   = 'utility_electricity'
    SOURCE_TRAVEL    = 'corporate_travel'
    SOURCE_GENERIC   = 'generic'
    SOURCE_TYPE_CHOICES = [
        (SOURCE_SAP_FUEL, 'SAP Fuel & Procurement'),
        (SOURCE_UTILITY,  'Utility Electricity'),
        (SOURCE_TRAVEL,   'Corporate Travel'),
        (SOURCE_GENERIC,  'Generic ESG'),
    ]

    # ── GHG Scope choices ───────────────────────────────────────────────────
    SCOPE_1 = 'scope_1'   # Direct emissions (fuel combustion, company vehicles)
    SCOPE_2 = 'scope_2'   # Indirect — purchased electricity
    SCOPE_3 = 'scope_3'   # Other indirect (business travel, supply chain)
    SCOPE_CHOICES = [
        (SCOPE_1, 'Scope 1 — Direct Emissions'),
        (SCOPE_2, 'Scope 2 — Purchased Energy'),
        (SCOPE_3, 'Scope 3 — Value Chain'),
    ]

    # ── Company & source info ───────────────────────────────────────────────
    company_name = models.CharField(max_length=255)
    source       = models.CharField(
        max_length=100,
        help_text="Data provider name e.g. SAP, EDF Meter, Concur"
    )
    source_type  = models.CharField(          # ← NEW
        max_length=30,
        choices=SOURCE_TYPE_CHOICES,
        default=SOURCE_GENERIC,
        db_index=True
    )
    year         = models.IntegerField(help_text="Fiscal year of the data")

    # ── GHG Scope & Activity ────────────────────────────────────────────────
    scope_category = models.CharField(        # ← NEW
        max_length=20,
        choices=SCOPE_CHOICES,
        default=SCOPE_1,
        db_index=True
    )
    activity_type  = models.CharField(        # ← NEW
        max_length=60,
        default='general',
        help_text="e.g. fuel_combustion, electricity_consumption, business_travel"
    )

    # ── Normalised ESG metrics ──────────────────────────────────────────────
    # normalized_emissions is the SINGLE unified metric — CO₂e in metric tons.
    # This allows comparing records across different source types.
    normalized_emissions = models.FloatField(  # ← NEW
        null=True, blank=True,
        help_text="CO₂ equivalent in metric tons — unified across all source types"
    )

    # Original raw metrics (kept for transparency / audit)
    carbon_emissions   = models.FloatField(null=True, blank=True,
                                           help_text="Raw CO₂ in metric tons")
    energy_consumption = models.FloatField(null=True, blank=True,
                                           help_text="Energy used in MWh")
    water_usage        = models.FloatField(null=True, blank=True,
                                           help_text="Water used in cubic meters")
    employee_count     = models.IntegerField(null=True, blank=True)

    # Source-specific raw fields (stored for traceability)
    raw_data = models.JSONField(             # ← NEW
        default=dict, blank=True,
        help_text="Original source-specific fields stored as JSON"
    )

    # ── Upload provenance ───────────────────────────────────────────────────
    original_source_file = models.CharField(max_length=255, blank=True, default='')  # ← NEW
    created_by           = models.CharField(max_length=100, blank=True, default='System')  # ← NEW

    # ── Review workflow ─────────────────────────────────────────────────────
    status            = models.CharField(
        max_length=20, choices=STATUS_CHOICES,
        default=STATUS_PENDING, db_index=True
    )
    is_suspicious     = models.BooleanField(default=False, db_index=True)
    suspicious_reason = models.TextField(blank=True, default='')

    # ── Timestamps & reviewer ───────────────────────────────────────────────
    uploaded_at  = models.DateTimeField(default=timezone.now)
    reviewed_at  = models.DateTimeField(null=True, blank=True)
    reviewed_by  = models.CharField(max_length=100, blank=True, default='')
    notes        = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'ESG Record'
        verbose_name_plural = 'ESG Records'

    def __str__(self):
        return f"{self.company_name} [{self.get_source_type_display()}] ({self.year}) — {self.status}"


class AuditLog(models.Model):
    """
    Immutable audit trail. Append-only — never update or delete.
    """
    ACTION_UPLOADED = 'uploaded'
    ACTION_APPROVED = 'approved'
    ACTION_REJECTED = 'rejected'
    ACTION_FLAGGED  = 'flagged'     # ← NEW: analyst manually flags
    ACTION_CHOICES  = [
        (ACTION_UPLOADED, 'Uploaded'),
        (ACTION_APPROVED, 'Approved'),
        (ACTION_REJECTED, 'Rejected'),
        (ACTION_FLAGGED,  'Flagged'),
    ]

    record       = models.ForeignKey(ESGRecord, on_delete=models.CASCADE,
                                     related_name='audit_logs')
    action       = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.CharField(max_length=100, default='System')
    timestamp    = models.DateTimeField(default=timezone.now)
    details      = models.TextField(blank=True, default='')
    # Store before/after for edits (empty for upload/approve/reject)
    old_value    = models.TextField(blank=True, default='')  # ← NEW
    new_value    = models.TextField(blank=True, default='')  # ← NEW

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"[{self.action.upper()}] {self.record.company_name} by {self.performed_by}"
