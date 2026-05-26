"""
records/urls.py — UPGRADED
---------------------------
CHANGES: Added /api/records/<id>/flag/ endpoint
"""

from django.urls import path
from . import views

urlpatterns = [
    path('upload/',                    views.UploadCSVView.as_view(),    name='upload-csv'),
    path('records/',                   views.RecordListView.as_view(),   name='record-list'),
    path('records/<int:pk>/',          views.RecordDetailView.as_view(), name='record-detail'),
    path('records/<int:pk>/approve/',  views.ApproveRecordView.as_view(), name='record-approve'),
    path('records/<int:pk>/reject/',   views.RejectRecordView.as_view(),  name='record-reject'),
    path('records/<int:pk>/flag/',     views.FlagRecordView.as_view(),    name='record-flag'),   # ← NEW
    path('audit-logs/',                views.AuditLogListView.as_view(), name='audit-logs'),
    path('dashboard/',                 views.DashboardView.as_view(),    name='dashboard'),
]
