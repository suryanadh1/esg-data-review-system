"""
records/urls.py
---------------
Maps URL patterns to view classes for the records app.
WHY PATH PREFIXES LIKE 'records/<id>/approve/'?
  REST convention: the resource (record) is in the URL,
  the action (approve) is a sub-path. This is clean and predictable.
"""

from django.urls import path
from . import views

urlpatterns = [
    # CSV Upload
    path('upload/',                    views.UploadCSVView.as_view(),    name='upload-csv'),

    # Record CRUD
    path('records/',                   views.RecordListView.as_view(),   name='record-list'),
    path('records/<int:pk>/',          views.RecordDetailView.as_view(), name='record-detail'),

    # Review actions
    path('records/<int:pk>/approve/',  views.ApproveRecordView.as_view(), name='record-approve'),
    path('records/<int:pk>/reject/',   views.RejectRecordView.as_view(),  name='record-reject'),

    # Audit & Dashboard
    path('audit-logs/',                views.AuditLogListView.as_view(), name='audit-logs'),
    path('dashboard/',                 views.DashboardView.as_view(),    name='dashboard'),
]
