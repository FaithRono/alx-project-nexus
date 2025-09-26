"""
URL configuration for poll system project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.shortcuts import redirect
from django.shortcuts import render
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from . import views

def api_root_view(request):
    return HttpResponse("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🗳️ Poll System API</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #333;
            }
            
            .container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 3rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 600px;
                width: 90%;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .logo {
                font-size: 4rem;
                margin-bottom: 1rem;
                animation: bounce 2s infinite;
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            h1 {
                font-size: 2.5rem;
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .subtitle {
                font-size: 1.2rem;
                color: #666;
                margin-bottom: 2rem;
                font-weight: 300;
            }
            
            .links-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin: 2rem 0;
            }
            
            .link-card {
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 15px;
                padding: 1.5rem;
                text-decoration: none;
                color: white;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            
            .link-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            
            .link-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 30px rgba(102, 126, 234, 0.4);
            }
            
            .link-card:hover::before {
                left: 100%;
            }
            
            .link-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
                display: block;
            }
            
            .link-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            }
            
            .link-desc {
                font-size: 0.9rem;
                opacity: 0.9;
                line-height: 1.4;
            }
            
            .footer {
                margin-top: 2rem;
                padding-top: 2rem;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
                color: #666;
                font-size: 0.9rem;
            }
            
            .status-badge {
                display: inline-block;
                background: #28a745;
                color: white;
                padding: 0.3rem 0.8rem;
                border-radius: 20px;
                font-size: 0.8rem;
                margin-left: 0.5rem;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 2rem;
                    margin: 1rem;
                }
                
                h1 {
                    font-size: 2rem;
                }
                
                .links-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🗳️</div>
            <h1>Poll System API</h1>
            <p class="subtitle">
                Welcome to the Online Poll System
                <span class="status-badge">🟢 Online</span>
            </p>
            
            <div class="links-grid">
                <a href="/api/docs/" class="link-card">
                    <i class="fas fa-book link-icon"></i>
                    <div class="link-title">API Documentation</div>
                    <div class="link-desc">Interactive Swagger UI for testing API endpoints</div>
                </a>
                
                <a href="/api/redoc/" class="link-card">
                    <i class="fas fa-file-alt link-icon"></i>
                    <div class="link-title">ReDoc Documentation</div>
                    <div class="link-desc">Clean and detailed API documentation</div>
                </a>
                
                <a href="/admin/" class="link-card">
                    <i class="fas fa-cog link-icon"></i>
                    <div class="link-title">Admin Panel</div>
                    <div class="link-desc">Django administration interface</div>
                </a>
                
                <a href="/api/polls/" class="link-card">
                    <i class="fas fa-chart-bar link-icon"></i>
                    <div class="link-title">Polls API</div>
                    <div class="link-desc">Direct access to polls data endpoint</div>
                </a>
            </div>
            
            <div class="footer">
                <p><i class="fas fa-rocket"></i> Django Poll System v1.0</p>
                <p><i class="fas fa-home"></i> <a href="/" style="color: #667eea;">Go to Frontend</a></p>
            </div>
        </div>
    </body>
    </html>
    """)

urlpatterns = [
    # ✅ MAIN FRONTEND PAGE
    path('', views.index, name='index'),
    
    # ✅ AUTHENTICATION ENDPOINTS
    path('accounts/login/', views.api_login, name='api_login'),
    path('accounts/register/', views.api_register, name='api_register'),
    path('accounts/logout/', views.api_logout, name='api_logout'),
    
    # ✅ POLL MANAGEMENT ENDPOINTS (FRONTEND)
    path('api/polls/', views.api_polls, name='api_polls'),  # GET all polls
    path('api/polls/create/', views.create_poll, name='create_poll'),  # CREATE poll (frontend expects this)
    path('api/my-polls/', views.api_my_polls, name='api_my_polls'),  # User's polls
    
    # ✅ INDIVIDUAL POLL MANAGEMENT (RESTful style - frontend expects this)
    path('api/polls/<int:poll_id>/', views.poll_detail, name='poll_detail'),  # GET, PUT, DELETE
    path('api/polls/<int:poll_id>/vote/', views.vote_poll, name='vote_poll'),
    path('api/polls/<int:poll_id>/results/', views.poll_results, name='poll_results'),
    
    # ✅ ANALYTICS ENDPOINTS (frontend expects these exact URLs)
    path('api/statistics/', views.api_statistics, name='api_statistics'),
    path('api/statistics/', views.analytics_data, name='statistics_data'),
    path('api/statistics/detailed/', views.detailed_statistics, name='detailed_statistics'),
    path('api/statistics/top-polls/', views.top_polls, name='top_polls'),
    
    
    # ✅ ADMIN & DOCUMENTATION
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # ✅ API ROOT
    path('api/', api_root_view, name='api-root'),
]