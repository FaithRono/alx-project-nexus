# my_tennis_club/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('polls.urls')),  # Include your polls app URLs
]