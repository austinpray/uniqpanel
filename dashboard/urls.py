
from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('new', views.new, name='new'),
    path('analyze', views.analyze, name='analyze'),
    path('api/files', views.list_files, name='files'),
    path('api/files/upload', views.upload, name='upload'),
    path('api/files/merge', views.api_merge_files, name='merge'),
]
