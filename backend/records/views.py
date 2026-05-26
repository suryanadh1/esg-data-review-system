"""
records/views.py
----------------
API view functions. Each view handles one endpoint.

DESIGN PRINCIPLES FOLLOWED:
  - Views are kept thin — heavy logic lives in utils.py
  - We use DRF's APIView for explicit control (easier to understand
    than ViewSets for beginners)
  - Every response is JSON with a consistent shape:
      { "success": bool, "data": ..., "message": str }
"""

from django.utils import timezone
from django.db.models import Count, Q

from rest_framework.views     import APIView
from rest_framework.response  import Response
from rest_framework           import status
from rest_framework.parsers   import MultiPartParser, FormParser

from .models       import ESGRecord, AuditLog
from .serializers  import (
    ESGRecordSerializer, ESGRecordListSerializer,
    AuditLogSerializer, ReviewSerializer
)
from .utils import parse_csv_to_records


# ── 1. CSV Upload ─────────────────────────────────────────────────────────────

class UploadCSVView(APIView):
    """
    POST /api/upload/
    Accepts a multipart/form-data request with a 'file' field.
    Parses the CSV, normalises rows, runs suspicious detection,
    bulk-inserts records, and creates audit logs.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')

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

        try:
            records_data = parse_csv_to_records(file_obj)
        except ValueError as e:
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not records_data:
            return Response(
                {'success': False, 'message': 'CSV file is empty or has no valid rows.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Bulk create ESGRecord objects — one DB query for all rows
        new_records = ESGRecord.objects.bulk_create([
            ESGRecord(**row) for row in records_data
        ])

        # Create an audit log entry for each new record
        AuditLog.objects.bulk_create([
            AuditLog(
                record=rec,
                action=AuditLog.ACTION_UPLOADED,
                performed_by='System (CSV Import)',
                details=f"Uploaded from file: {file_obj.name}"
            )
            for rec in new_records
        ])

        suspicious_count = sum(1 for r in records_data if r['is_suspicious'])

        return Response({
            'success': True,
            'message': f'Successfully imported {len(new_records)} records ({suspicious_count} flagged as suspicious).',
            'total_imported':   len(new_records),
            'suspicious_count': suspicious_count,
        }, status=status.HTTP_201_CREATED)


# ── 2. Record List ─────────────────────────────────────────────────────────────

class RecordListView(APIView):
    """
    GET /api/records/
    Returns all ESG records. Supports query param filters:
      ?status=pending|approved|rejected
      ?is_suspicious=true|false
      ?source=Bloomberg
      ?year=2023
      ?search=CompanyName
    """

    def get(self, request):
        qs = ESGRecord.objects.all()

        # Apply filters from query params
        status_filter = request.query_params.get('status')
        if status_filter in ['pending', 'approved', 'rejected']:
            qs = qs.filter(status=status_filter)

        suspicious_filter = request.query_params.get('is_suspicious')
        if suspicious_filter is not None:
            qs = qs.filter(is_suspicious=(suspicious_filter.lower() == 'true'))

        source_filter = request.query_params.get('source')
        if source_filter:
            qs = qs.filter(source__icontains=source_filter)

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


# ── 3. Record Detail ───────────────────────────────────────────────────────────

class RecordDetailView(APIView):
    """
    GET /api/records/<id>/
    Returns full record detail including all audit logs.
    """

    def get_object(self, pk):
        try:
            return ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return None

    def get(self, request, pk):
        record = self.get_object(pk)
        if record is None:
            return Response(
                {'success': False, 'message': f'Record {pk} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = ESGRecordSerializer(record)
        return Response({'success': True, 'data': serializer.data})


# ── 4. Approve Record ──────────────────────────────────────────────────────────

class ApproveRecordView(APIView):
    """
    POST /api/records/<id>/approve/
    Body: { "reviewer_name": "Alice", "notes": "Looks correct." }
    Marks the record as approved and creates an audit log entry.
    """

    def post(self, request, pk):
        try:
            record = ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return Response(
                {'success': False, 'message': f'Record {pk} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if record.status != ESGRecord.STATUS_PENDING:
            return Response(
                {'success': False,
                 'message': f'Record is already {record.status}. Only pending records can be approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid input.', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        vd = serializer.validated_data

        # Update record
        record.status      = ESGRecord.STATUS_APPROVED
        record.reviewed_by = vd['reviewer_name']
        record.reviewed_at = timezone.now()
        record.notes       = vd.get('notes', '')
        record.save()

        # Create audit log
        AuditLog.objects.create(
            record       = record,
            action       = AuditLog.ACTION_APPROVED,
            performed_by = vd['reviewer_name'],
            details      = vd.get('notes', 'No notes provided.')
        )

        return Response({
            'success': True,
            'message': f'Record approved by {vd["reviewer_name"]}.',
            'data':    ESGRecordSerializer(record).data,
        })


# ── 5. Reject Record ───────────────────────────────────────────────────────────

class RejectRecordView(APIView):
    """
    POST /api/records/<id>/reject/
    Body: { "reviewer_name": "Bob", "notes": "Carbon value implausible." }
    """

    def post(self, request, pk):
        try:
            record = ESGRecord.objects.get(pk=pk)
        except ESGRecord.DoesNotExist:
            return Response(
                {'success': False, 'message': f'Record {pk} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if record.status != ESGRecord.STATUS_PENDING:
            return Response(
                {'success': False,
                 'message': f'Record is already {record.status}. Only pending records can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'success': False, 'message': 'Invalid input.', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        vd = serializer.validated_data

        record.status      = ESGRecord.STATUS_REJECTED
        record.reviewed_by = vd['reviewer_name']
        record.reviewed_at = timezone.now()
        record.notes       = vd.get('notes', '')
        record.save()

        AuditLog.objects.create(
            record       = record,
            action       = AuditLog.ACTION_REJECTED,
            performed_by = vd['reviewer_name'],
            details      = vd.get('notes', 'No notes provided.')
        )

        return Response({
            'success': True,
            'message': f'Record rejected by {vd["reviewer_name"]}.',
            'data':    ESGRecordSerializer(record).data,
        })


# ── 6. Audit Log List ──────────────────────────────────────────────────────────

class AuditLogListView(APIView):
    """
    GET /api/audit-logs/
    Returns all audit log entries, newest first.
    """

    def get(self, request):
        logs = AuditLog.objects.select_related('record').all()
        serializer = AuditLogSerializer(logs, many=True)
        return Response({
            'success': True,
            'count':   logs.count(),
            'data':    serializer.data,
        })


# ── 7. Dashboard Stats ─────────────────────────────────────────────────────────

class DashboardView(APIView):
    """
    GET /api/dashboard/
    Returns summary statistics for the dashboard cards and charts.
    WHY SEPARATE ENDPOINT? The dashboard needs aggregated data, not
    individual records. Computing this in the frontend from a full
    records list would waste bandwidth and be slower.
    """

    def get(self, request):
        total    = ESGRecord.objects.count()
        pending  = ESGRecord.objects.filter(status='pending').count()
        approved = ESGRecord.objects.filter(status='approved').count()
        rejected = ESGRecord.objects.filter(status='rejected').count()
        flagged  = ESGRecord.objects.filter(is_suspicious=True).count()

        # Source breakdown for the pie chart
        sources = (
            ESGRecord.objects
            .values('source')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Year breakdown for the bar chart
        by_year = (
            ESGRecord.objects
            .values('year')
            .annotate(count=Count('id'))
            .order_by('year')
        )

        # Recent activity (last 5 audit logs)
        recent_logs = AuditLog.objects.select_related('record').all()[:5]
        recent_serializer = AuditLogSerializer(recent_logs, many=True)

        return Response({
            'success': True,
            'data': {
                'summary': {
                    'total':    total,
                    'pending':  pending,
                    'approved': approved,
                    'rejected': rejected,
                    'flagged':  flagged,
                },
                'by_source': list(sources),
                'by_year':   list(by_year),
                'recent_activity': recent_serializer.data,
            }
        })
