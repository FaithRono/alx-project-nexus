from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import IntegrityError
from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Count, Prefetch, Avg
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from .models import Poll, Option, Vote
from .serializers import (
    PollListSerializer, PollDetailSerializer, PollCreateSerializer,
    VoteSerializer, PollResultsSerializer, OptionSerializer
)


class PollListView(generics.ListAPIView):
    """
    Retrieve all active polls with basic information
    """
    serializer_class = PollListSerializer
    
    def get_queryset(self):
        """Get active polls with basic information - FIXED"""
        return Poll.objects.filter(is_active=True).prefetch_related('options')


class PollCreateView(generics.CreateAPIView):
    """
    Create a new poll with options
    """
    serializer_class = PollCreateSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to add better error handling"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            poll = serializer.save()
            return Response(
                PollDetailSerializer(poll).data, 
                status=status.HTTP_201_CREATED
            )
        else:
            return Response({
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


class PollDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific poll
    """
    serializer_class = PollDetailSerializer
    lookup_field = 'pk'
    
    def get_queryset(self):
        """Get poll with optimized option data"""
        return Poll.objects.prefetch_related('options')


class VoteCreateView(generics.CreateAPIView):
    """
    Cast a vote for a poll option
    """
    serializer_class = VoteSerializer
    
    @extend_schema(
        summary="Cast a vote",
        description="Vote for a specific option in a poll. Duplicate voting is prevented by IP and session.",
        examples=[
            OpenApiExample(
                "Vote Example",
                value={"option": 1}
            )
        ],
        responses={
            201: OpenApiResponse(description="Vote cast successfully"),
            400: OpenApiResponse(description="Invalid vote (duplicate, expired poll, etc.)"),
        }
    )
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"error": "You have already voted in this poll"},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    summary="Get poll results",
    description="Retrieve detailed voting results for a specific poll",
    responses={
        200: PollResultsSerializer,
        404: OpenApiResponse(description="Poll not found"),
    }
)
@api_view(['GET'])
def poll_results(request, pk):
    """
    Get comprehensive results for a specific poll
    """
    poll = get_object_or_404(Poll, id=pk)
    
    total_votes = Vote.objects.filter(option__poll=poll).count()
    
    options = poll.options.all()
    results = []
    for option in options:
        vote_count = Vote.objects.filter(option=option).count()
        results.append({
            'option_id': option.id,
            'option_text': option.text,
            'votes': vote_count,
            'percentage': (vote_count / total_votes * 100) if total_votes > 0 else 0
        })
    
    results_data = {
        'poll_id': poll.id,
        'poll_title': poll.title,
        'total_votes': total_votes,
        'results': results
    }
    
    serializer = PollResultsSerializer(results_data)
    return Response(serializer.data)


@api_view(['GET'])
def poll_statistics(request):
    """
    Get overall statistics about the polling system
    """
    try:
        total_polls = Poll.objects.count()
        active_polls = Poll.objects.filter(is_active=True).count()
        total_votes = Vote.objects.count()
        
        most_popular_data = None
        
        if total_polls > 0:
            best_poll = None
            max_votes = 0
            
            for poll in Poll.objects.all():
                poll_votes = 0
                for option in poll.options.all():
                    poll_votes += Vote.objects.filter(option=option).count()
                
                if poll_votes > max_votes:
                    max_votes = poll_votes
                    best_poll = poll
            
            if best_poll and max_votes > 0:
                most_popular_data = {
                    'id': best_poll.id,
                    'title': best_poll.title,
                    'votes': max_votes
                }
        
        return Response({
            'total_polls': total_polls,
            'active_polls': active_polls,
            'total_votes': total_votes,
            'most_popular_poll': most_popular_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        return Response({
            'error': 'Statistics calculation failed',
            'details': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# NEW VIEWS FOR JAVASCRIPT FRONTEND
# =============================================================================

@api_view(['GET'])
@login_required
def my_polls(request):
    """API endpoint for getting current user's polls"""
    if request.method == 'GET':
        try:
            polls = Poll.objects.filter(created_by=request.user)
            polls_data = []
            for poll in polls:
                vote_count = Vote.objects.filter(option__poll=poll).count()
                
                polls_data.append({
                    'id': poll.id,
                    'title': poll.title,
                    'description': poll.description,
                    'vote_count': vote_count,
                    'is_active': poll.is_active,
                    'created_at': poll.created_at.isoformat(),
                    'category': poll.category
                })
            return Response({'polls': polls_data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def analytics_detailed(request):
    """API endpoint for detailed analytics"""
    if request.method == 'GET':
        try:
            total_polls = Poll.objects.count()
            total_votes = Vote.objects.count()
            active_polls = Poll.objects.filter(is_active=True).count()
            
            avg_votes_per_poll = 0
            if total_polls > 0:
                avg_votes_per_poll = total_votes / total_polls
            
            category_dist = Poll.objects.values('category').annotate(
                count=Count('id')
            )
            
            data = {
                'completionRate': round((total_votes / (total_polls * 10)) * 100) if total_polls > 0 else 0,
                'avgVotesPerPoll': round(avg_votes_per_poll, 1),
                'engagementRate': min(100, round((total_votes / (total_polls * 20)) * 100)) if total_polls > 0 else 0,
                'categoryDistribution': [
                    {'name': cat['category'] or 'Uncategorized', 'count': cat['count']}
                    for cat in category_dist
                ]
            }
            return Response(data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def analytics_top_polls(request):
    """API endpoint for top polls"""
    if request.method == 'GET':
        try:
            top_polls = []
            for poll in Poll.objects.all():
                vote_count = Vote.objects.filter(option__poll=poll).count()
                participation_rate = round((vote_count / 50) * 100) if vote_count > 0 else 0
                
                top_polls.append({
                    'id': poll.id,
                    'title': poll.title,
                    'vote_count': vote_count,
                    'participation_rate': min(100, participation_rate)
                })
            
            top_polls.sort(key=lambda x: x['vote_count'], reverse=True)
            top_polls = top_polls[:6]
            
            return Response({'topPolls': top_polls})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# AUTHENTICATION VIEWS
# =============================================================================

@csrf_exempt
@require_http_methods(["POST"])
def signup_view(request):
    """User registration view"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        # Validation
        if not username or not email or not password:
            return JsonResponse({
                'success': False,
                'error': 'All fields are required'
            }, status=400)
        
        if password != confirm_password:
            return JsonResponse({
                'success': False,
                'error': 'Passwords do not match'
            }, status=400)
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'Username already exists'
            }, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Email already exists'
            }, status=400)
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # Log the user in
        login(request, user)
        
        return JsonResponse({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """User login view"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username and password are required'
            }, status=400)
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Invalid username or password'
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
def logout_view(request):
    """User logout view"""
    try:
        logout(request)
        return JsonResponse({
            'success': True,
            'message': 'Logout successful'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# POLL MANAGEMENT VIEWS (Form submissions)
# =============================================================================

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_poll(request):
    """Create poll view (for form submissions)"""
    try:
        data = json.loads(request.body)
        title = data.get('title')
        description = data.get('description', '')
        category = data.get('category', 'general')
        options = data.get('options', [])
        
        if not title:
            return JsonResponse({
                'success': False,
                'error': 'Poll title is required'
            }, status=400)
        
        if len(options) < 2:
            return JsonResponse({
                'success': False,
                'error': 'At least 2 options are required'
            }, status=400)
        
        # Create poll
        poll = Poll.objects.create(
            title=title,
            description=description,
            category=category,
            created_by=request.user,
            is_active=True
        )
        
        # Create options
        for option_text in options:
            Option.objects.create(
                poll=poll,
                text=option_text.strip()
            )
        
        return JsonResponse({
            'success': True,
            'message': 'Poll created successfully',
            'poll_id': poll.id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def edit_poll(request, poll_id):
    """Edit poll view"""
    try:
        poll = get_object_or_404(Poll, id=poll_id, created_by=request.user)
        data = json.loads(request.body)
        
        poll.title = data.get('title', poll.title)
        poll.description = data.get('description', poll.description)
        poll.category = data.get('category', poll.category)
        poll.save()
        
        # Update options if provided
        options = data.get('options')
        if options and len(options) >= 2:
            # Delete existing options
            poll.options.all().delete()
            # Create new options
            for option_text in options:
                Option.objects.create(
                    poll=poll,
                    text=option_text.strip()
                )
        
        return JsonResponse({
            'success': True,
            'message': 'Poll updated successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@login_required
@require_http_methods(["DELETE", "POST"])
def delete_poll(request, poll_id):
    """Delete poll view"""
    try:
        poll = get_object_or_404(Poll, id=poll_id, created_by=request.user)
        poll.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Poll deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def toggle_poll_status(request, poll_id):
    """Toggle poll active status"""
    try:
        poll = get_object_or_404(Poll, id=poll_id, created_by=request.user)
        poll.is_active = not poll.is_active
        poll.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Poll {"activated" if poll.is_active else "deactivated"} successfully',
            'is_active': poll.is_active
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


# =============================================================================
# HTML PAGE VIEWS
# =============================================================================

def index(request):
    """Home page"""
    return render(request, 'index.html')

def all_polls_page(request):
    """HTML page for browsing all polls"""
    return render(request, 'polls.html')

def create_poll_page(request):
    """HTML page for creating polls"""
    return render(request, 'create.html')

@login_required
def my_polls_page(request):
    """HTML page for user's polls"""
    return render(request, 'my_polls.html')

def statistics_page(request):
    """HTML page for statistics"""
    return render(request, 'statistics.html')