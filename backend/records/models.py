"""
records/models.py
-----------------
Defines the database tables for our ESG system.

WHY TWO MODELS?
  - ESGRecord  → stores every data point ingested from CSV files
  - AuditLog   → keeps a permanent trail of every analyst action
                  (approve/reject). Required for compliance/audit.

WHY NOT USE DJANGO'S USER MODEL FOR reviewer?
  For this prototype we keep it simple — reviewer is just a name
  string. In production you'd link to request.user.
"""

from django.db import models
from django.utils import timezone


class ESGRecord(models.Model):
    """
    One row = one company's ESG data point for a given year.
    Analysts review these records and mark them approved or rejected.
    """

    # ── Status choices ────────────────────────────────────────────────────
    STATUS_PENDING  = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    # ── Company & source info ─────────────────────────────────────────────
    company_name = models.CharField(max_length=255)
    source       = models.CharField(
        max_length=100,
        help_text="Data provider e.g. Bloomberg, Reuters, Manual"
    )
    year         = models.IntegerField(help_text="Fiscal year of the data")

    # ── ESG metrics (nullable because CSVs often have missing values) ─────
    carbon_emissions  = models.FloatField(
        null=True, blank=True,
        help_text="CO₂ equivalent in metric tons"
    )
    energy_consumption = models.FloatField(
        null=True, blank=True,
        help_text="Energy used in MWh"
    )
    water_usage       = models.FloatField(
        null=True, blank=True,
        help_text="Water used in cubic meters"
    )
    employee_count    = models.IntegerField(
        null=True, blank=True,
        help_text="Number of full-time employees"
    )

    # ── Review workflow ────────────────────────────────────────────────────
    status      = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True          # index for fast filtering
    )
    is_suspicious    = models.BooleanField(default=False, db_index=True)
    suspicious_reason = models.TextField(blank=True, default='')

    # ── Timestamps & reviewer ─────────────────────────────────────────────
    uploaded_at  = models.DateTimeField(default=timezone.now)
    reviewed_at  = models.DateTimeField(null=True, blank=True)
    reviewed_by  = models.CharField(max_length=100, blank=True, default='')
    notes        = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'ESG Record'
        verbose_name_plural = 'ESG Records'

    def __str__(self):
        return f"{self.company_name} ({self.year}) — {self.status}"


class AuditLog(models.Model):
    """
    Immutable record of every action taken on an ESGRecord.
    WHY IMMUTABLE: Audit logs must never be edited — they are legal evidence.
    We never UPDATE rows here; we only INSERT.
    """

    ACTION_UPLOADED = 'uploaded'
    ACTION_APPROVED = 'approved'
    ACTION_REJECTED = 'rejected'
    ACTION_CHOICES  = [
        (ACTION_UPLOADED, 'Uploaded'),
        (ACTION_APPROVED, 'Approved'),
        (ACTION_REJECTED, 'Rejected'),
    ]

    record       = models.ForeignKey(
        ESGRecord,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action       = models.CharField(max_length=20, choices=ACTION_CHOICES)
    performed_by = models.CharField(max_length=100, default='System')
    timestamp    = models.DateTimeField(default=timezone.now)
    details      = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"[{self.action.upper()}] {self.record.company_name} by {self.performed_by}"
