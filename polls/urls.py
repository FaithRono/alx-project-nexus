from django.urls import path
from . import views
from .views import (
    PollListView, PollCreateView, PollDetailView,
    VoteCreateView, poll_results, poll_statistics,
    my_polls, analytics_detailed, analytics_top_polls  # Add these imports
)

app_name = 'poll_system'

urlpatterns = [
    # Main pages
    path('', views.index, name='index'),
    
    # Authentication
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # API endpoints for JavaScript frontend - FIXED PATHS
    path('api/polls/', PollListView.as_view(), name='api_poll_list'),
    path('api/polls/create/', PollCreateView.as_view(), name='api_poll_create'),
    path('api/polls/<int:pk>/', PollDetailView.as_view(), name='api_poll_detail'),
    path('api/polls/<int:pk>/vote/', VoteCreateView.as_view(), name='api_poll_vote'),
    path('api/polls/<int:pk>/results/', poll_results, name='api_poll_results'),
    path('api/my-polls/', my_polls, name='api_my_polls'),  # FIXED: Added this endpoint
    
    # Analytics API endpoints - CHANGE TO MATCH JAVASCRIPT
    path('api/statistics/', poll_statistics, name='api_statistics'),
    path('api/statistics/detailed/', analytics_detailed, name='api_statistics_detailed'),
    path('api/statistics/top-polls/', analytics_top_polls, name='api_statistics_top_polls'),
    
    # HTML page routes (for direct browser access)
    path('polls/', views.all_polls_page, name='all_polls_page'),
    path('create-poll/', views.create_poll_page, name='create_poll_page'),
    path('my-polls/', views.my_polls_page, name='my_polls_page'),
    path('statistics/', views.statistics_page, name='statistics_page'),
    
    # Poll management actions
    path('edit-poll/<int:poll_id>/', views.edit_poll, name='edit_poll'),
    path('delete-poll/<int:poll_id>/', views.delete_poll, name='delete_poll'),
    path('toggle-poll/<int:poll_id>/', views.toggle_poll_status, name='toggle_poll'),
]