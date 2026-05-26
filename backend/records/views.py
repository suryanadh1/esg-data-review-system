"""
records/views.py — UPGRADED
-----------------------------
CHANGES FROM v1:
  + UploadCSVView: reads source_type + uploaded_by from form data
  + FlagRecordView: POST /api/records/<id>/flag/
  + RecordListView: filter by source_type, scope_category
  + DashboardView: adds scope breakdown, approval_rate, flagged_rate, by_source_type
"""

from django.utils import timezone
from django.db.models import Count, Q, Avg

from rest_framework.views    import APIView
from rest_framework.response import Response
from rest_framework          import status
from rest_framework.parsers  import MultiPartParser, FormParser

from .models      import ESGRecord, AuditLog
from .serializers import (
    ESGRecordSerializer, ESGRecordListSerializer,
    AuditLogSerializer, ReviewSerializer, FlagSerializer,
)
from .utils import parse_csv_to_records


# ── 1. CSV Upload (upgraded) ─────────────────────────────────────────────────

class UploadCSVView(APIView):
    """
    POST /api/upload/
    Form fields:
      file        — the CSV file
      source_type — sap_fuel | utility_electricity | corporate_travel | generic
      uploaded_by — analyst name (optional)
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj    = request.FILES.get('file')
        source_type = request.data.get('source_type', 'generic').strip()
        uploaded_by = request.data.get('uploaded_by', 'System').strip() or 'System'

        if not file_obj:
            return Response(
                {'success': False, 'message': 'No file provided. Send a CSV as "file".'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not file_obj.name.endswith('.csv'):
            return Response(
                {'success': False, 'message': 'Only .csv files are accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_source_types = ['sap_fuel', 'utility_electricity', 'corporate_travel', 'generic']
        if source_type not in valid_source_types:
            return Response(
                {'success': False,
                 'message': f'Invalid source_type "{source_type}". Choose from: {valid_source_types}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            records_data = parse_csv_to_records(
                file_obj,
                source_type=source_type,
                uploaded_by=uploaded_by,
                filename=file_obj.name,
            )
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not records_data:
            return Response(
                {'success': False, 'message': 'CSV is empty or has no valid rows.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_records = ESGRecord.objects.bulk_create([
            ESGRecord(**row) for row in records_data
        ])

        AuditLog.objects.bulk_create([
            AuditLog(
                record=rec,
                action=AuditLog.ACTION_UPLOADED,
                performed_by=uploaded_by,
                details=f"Source type: {source_type} | File: {file_obj.name}",
            )
            for rec in new_records
        ])

        suspicious_count = sum(1 for r in records_data if r['is_suspicious'])

        return Response({
            'success':         True,
            'message':         f'Imported {len(new_records)} records ({suspicious_count} suspicious).',
            'total_imported':  len(new_records),
            'suspicious_count': suspicious_count,
            'source_type':     source_type,
            'uploaded_by':     uploaded_by,
        }, status=status.HTTP_201_CREATED)


# ── 2. Record List (upgraded filters) ────────────────────────────────────────

class RecordListView(APIView):
    """
    GET /api/records/
    New filter params:
      ?source_type=sap_fuel|utility_electricity|corporate_travel|generic
      ?scope=scope_1|scope_2|scope_3
    """
    def get(self, request):
        qs = ESGRecord.objects.all()

        status_filter = request.query_params.get('status')
        if status_filter in ['pending', 'approved', 'rejected', 'flagged']:
            qs = qs.filter(status=status_filter)

        suspicious_filter = request.query_params.get('is_suspicious')
        if suspicious_filter is not None:
            qs = qs.filter(is_suspicious=(suspicious_filter.lower() == 'true'))

        source_filter = request.query_params.get('source')
        if source_filter:
            qs = qs.filter(source__icontains=source_filter)

        source_type_filter = request.query_params.get('source_type')
        if source_type_filter:
            qs = qs.filter(source_type=source_type_filter)

        scope_filter = request.query_params.get('scope')
        if scope_filter:
            qs = qs.filter(scope_category=scope_filter)

        year_filter = request.query_params.get('year')
        if year_filter:
            qs = qs.filter(year=year_filter)

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(company_name__icontains=search)

        serializer = ESGRecordListSerializer(qs, many=True)
        return Response({
            'success': True,
            'count':   qs.count(),
            'data':    serializer.data,
        })


# ── 3. Record Detail ─────────────────────────────────────────────────────────

class RecordDetailView(APIView):
    def get_object(self, pk):
        try:
            return ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return None

    def get(self, request, pk):
        record = self.get_object(pk)
        if record is None:
            return Response({'success': False, 'message': f'Record {pk} not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': ESGRecordSerializer(record).data})


# ── 4. Approve ───────────────────────────────────────────────────────────────

class ApproveRecordView(APIView):
    def post(self, request, pk):
        try:
            record = ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return Response({'success': False, 'message': f'Record {pk} not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        if record.status not in [ESGRecord.STATUS_PENDING, ESGRecord.STATUS_FLAGGED]:
            return Response(
                {'success': False,
                 'message': f'Record is already {record.status}. Cannot approve.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        vd       = serializer.validated_data
        old_status = record.status

        record.status      = ESGRecord.STATUS_APPROVED
        record.reviewed_by = vd['reviewer_name']
        record.reviewed_at = timezone.now()
        record.notes       = vd.get('notes', '')
        record.save()

        AuditLog.objects.create(
            record=record, action=AuditLog.ACTION_APPROVED,
            performed_by=vd['reviewer_name'],
            details=vd.get('notes', 'No notes.'),
            old_value=old_status, new_value=ESGRecord.STATUS_APPROVED,
        )

        return Response({
            'success': True,
            'message': f'Record approved by {vd["reviewer_name"]}.',
            'data':    ESGRecordSerializer(record).data,
        })


# ── 5. Reject ────────────────────────────────────────────────────────────────

class RejectRecordView(APIView):
    def post(self, request, pk):
        try:
            record = ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return Response({'success': False, 'message': f'Record {pk} not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        if record.status not in [ESGRecord.STATUS_PENDING, ESGRecord.STATUS_FLAGGED]:
            return Response(
                {'success': False,
                 'message': f'Record is already {record.status}. Cannot reject.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        vd         = serializer.validated_data
        old_status = record.status

        record.status      = ESGRecord.STATUS_REJECTED
        record.reviewed_by = vd['reviewer_name']
        record.reviewed_at = timezone.now()
        record.notes       = vd.get('notes', '')
        record.save()

        AuditLog.objects.create(
            record=record, action=AuditLog.ACTION_REJECTED,
            performed_by=vd['reviewer_name'],
            details=vd.get('notes', 'No notes.'),
            old_value=old_status, new_value=ESGRecord.STATUS_REJECTED,
        )

        return Response({
            'success': True,
            'message': f'Record rejected by {vd["reviewer_name"]}.',
            'data':    ESGRecordSerializer(record).data,
        })


# ── 6. Flag (NEW) ────────────────────────────────────────────────────────────

class FlagRecordView(APIView):
    """
    POST /api/records/<id>/flag/
    Body: { "reviewer_name": "Alice", "flag_reason": "Suspiciously low emissions vs last year." }

    WHY A SEPARATE FLAG STATUS?
      'flagged' differs from 'is_suspicious'. is_suspicious is set by the system
      automatically on upload. 'flagged' is set manually by an analyst who spots
      something wrong that the system missed — human-in-the-loop.
    """
    def post(self, request, pk):
        try:
            record = ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return Response({'success': False, 'message': f'Record {pk} not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        if record.status in [ESGRecord.STATUS_APPROVED, ESGRecord.STATUS_REJECTED]:
            return Response(
                {'success': False,
                 'message': f'Cannot flag a record that is already {record.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = FlagSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        vd         = serializer.validated_data
        old_status = record.status

        record.status = ESGRecord.STATUS_FLAGGED
        record.notes  = vd['flag_reason']
        record.save()

        AuditLog.objects.create(
            record=record, action=AuditLog.ACTION_FLAGGED,
            performed_by=vd['reviewer_name'],
            details=vd['flag_reason'],
            old_value=old_status, new_value=ESGRecord.STATUS_FLAGGED,
        )

        return Response({
            'success': True,
            'message': f'Record flagged by {vd["reviewer_name"]}.',
            'data':    ESGRecordSerializer(record).data,
        })


# ── 7. Audit Log ─────────────────────────────────────────────────────────────

class AuditLogListView(APIView):
    def get(self, request):
        logs = AuditLog.objects.select_related('record').all()
        action_filter = request.query_params.get('action')
        if action_filter:
            logs = logs.filter(action=action_filter)
        serializer = AuditLogSerializer(logs, many=True)
        return Response({'success': True, 'count': logs.count(), 'data': serializer.data})


# ── 8. Dashboard (upgraded) ──────────────────────────────────────────────────

class DashboardView(APIView):
    """
    GET /api/dashboard/
    NEW: by_scope, by_source_type, approval_rate, flagged_rate, total_emissions
    """
    def get(self, request):
        total    = ESGRecord.objects.count()
        pending  = ESGRecord.objects.filter(status='pending').count()
        approved = ESGRecord.objects.filter(status='approved').count()
        rejected = ESGRecord.objects.filter(status='rejected').count()
        flagged_status = ESGRecord.objects.filter(status='flagged').count()
        flagged  = ESGRecord.objects.filter(is_suspicious=True).count()

        approval_rate = round((approved / total * 100), 1) if total > 0 else 0
        flagged_rate  = round((flagged  / total * 100), 1) if total > 0 else 0

        # Scope breakdown — key upgrade for Breathe ESG
        by_scope = list(
            ESGRecord.objects
            .values('scope_category')
            .annotate(count=Count('id'))
            .order_by('scope_category')
        )

        # Source type breakdown
        by_source_type = list(
            ESGRecord.objects
            .values('source_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Legacy source breakdown
        by_source = list(
            ESGRecord.objects
            .values('source')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Year breakdown
        by_year = list(
            ESGRecord.objects
            .values('year')
            .annotate(count=Count('id'))
            .order_by('year')
        )

        # Total normalized emissions by scope
        from django.db.models import Sum
        emissions_by_scope = list(
            ESGRecord.objects
            .values('scope_category')
            .annotate(total_emissions=Sum('normalized_emissions'))
            .order_by('scope_category')
        )

        # Recent activity
        recent_logs       = AuditLog.objects.select_related('record').all()[:8]
        recent_serializer = AuditLogSerializer(recent_logs, many=True)

        return Response({
            'success': True,
            'data': {
                'summary': {
                    'total':          total,
                    'pending':        pending,
                    'approved':       approved,
                    'rejected':       rejected,
                    'flagged_status': flagged_status,
                    'suspicious':     flagged,
                    'approval_rate':  approval_rate,
                    'flagged_rate':   flagged_rate,
                },
                'by_scope':         by_scope,
                'by_source_type':   by_source_type,
                'by_source':        by_source,
                'by_year':          by_year,
                'emissions_by_scope': emissions_by_scope,
                'recent_activity':  recent_serializer.data,
            }
        })
