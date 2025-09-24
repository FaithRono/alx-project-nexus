import json
from django.db.models import Count, Q
from django.utils.dateparse import parse_datetime
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError
from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from functools import wraps
import logging

# Import your models
from .models import Poll, PollOption, Vote

logger = logging.getLogger(__name__)

def index(request):
    """Main page view"""
    return render(request, 'index.html')

# Custom decorator for JSON API authentication
def json_login_required(view_func):
    """Custom login_required decorator that returns JSON for API endpoints"""
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'error': 'Authentication required'
            }, status=401)
        return view_func(request, *args, **kwargs)
    return wrapped_view

# Authentication views
@ensure_csrf_cookie
@require_http_methods(["POST"])
def api_login(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username and password are required'
            }, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                return JsonResponse({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Account is disabled'
                }, status=401)
        else:
            return JsonResponse({
                'success': False,
                'error': 'Invalid username or password'
            }, status=401)
            
    except Exception as e:
        logger.error(f"Error in login: {e}")
        return JsonResponse({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=500)

@ensure_csrf_cookie
@require_http_methods(["POST"])
def api_register(request):
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        
        if not username or not email or not password:
            return JsonResponse({
                'success': False,
                'error': 'Username, email, and password are required'
            }, status=400)
        
        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'Username already exists'
            }, status=400)
        
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Email already registered'
            }, status=400)
        
        try:
            validate_password(password)
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'error': ' '.join(e.messages)
            }, status=400)
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })
        
    except Exception as e:
        logger.error(f"Error in registration: {e}")
        return JsonResponse({
            'success': False,
            'error': 'An unexpected error occurred'
        }, status=500)

@require_http_methods(["POST"])
def api_logout(request):
    try:
        if request.user.is_authenticated:
            logout(request)
            return JsonResponse({
                'success': True,
                'message': 'Logged out successfully'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Not logged in'
            }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An error occurred during logout'
        }, status=500)

# Helper function to serialize polls
def serialize_poll(poll, include_options=False):
    """Serialize poll object to dictionary - matches your exact model"""
    # Calculate vote count manually
    vote_count = Vote.objects.filter(poll=poll).count()
    
    # Handle expires_at properly
    expires_at = None
    if poll.expires_at:
        expires_at = poll.expires_at.isoformat()
    
    data = {
        'id': poll.id,
        'title': poll.title,
        'description': poll.description,
        'category': poll.category,
        'created_at': poll.created_at.isoformat(),
        'updated_at': poll.updated_at.isoformat() if hasattr(poll, 'updated_at') else None,
        'expires_at': expires_at,  # Only set if actually exists
        'vote_count': vote_count,
        'is_active': poll.is_active,
        'created_by': poll.creator.username,
    }
    
    if include_options:
        options = poll.options.all()
        data['options'] = []
        
        for i, option in enumerate(options):
            option_vote_count = Vote.objects.filter(option=option).count()
            data['options'].append({
                'id': option.id,
                'text': option.text,
                'vote_count': option_vote_count,
                'order': i,  # Generate order based on position
                'created_at': option.created_at.isoformat()
            })
    
    return data

# Poll API endpoints
@require_http_methods(["GET"])
def api_polls(request):
    """Get all polls - PUBLIC endpoint"""
    try:
        polls = Poll.objects.all().select_related('creator').prefetch_related('options', 'votes')
        
        polls_data = [serialize_poll(poll) for poll in polls]
        
        return JsonResponse({
            'success': True,
            'polls': polls_data,
            'count': len(polls_data)
        })
    except Exception as e:
        logger.error(f"Error loading polls: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Unable to load polls: {str(e)}'
        }, status=500)

@json_login_required
@require_http_methods(["GET"])
def api_my_polls(request):
    """Get current user's polls - REQUIRES LOGIN"""
    try:
        user_polls = Poll.objects.filter(creator=request.user).prefetch_related('options', 'votes')
        
        polls_data = [serialize_poll(poll, include_options=True) for poll in user_polls]
        
        return JsonResponse({
            'success': True,
            'polls': polls_data,
            'count': len(polls_data)
        })
    except Exception as e:
        logger.error(f"Error loading user polls: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Unable to load your polls: {str(e)}'
        }, status=500)

@json_login_required
@require_http_methods(["POST"])
def create_poll(request):
    """Create a new poll - REQUIRES LOGIN"""
    try:
        data = json.loads(request.body)
        
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', '').strip()
        expires_at = data.get('expires_at')
        options = data.get('options', [])
        
        # Validate input
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
        
        if len(options) > 10:
            return JsonResponse({
                'success': False,
                'error': 'Maximum 10 options allowed'
            }, status=400)
        
        # Parse expires_at if provided - ONLY if it's actually provided
        expires_at_obj = None
        if expires_at and expires_at.strip():
            try:
                from datetime import datetime
                expires_at_obj = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError:
                logger.warning(f"Invalid expiry date format: {expires_at}")
                # Don't set expiry if invalid
                expires_at_obj = None
        
        # Create the poll - EXACT FIELD NAMES FOR YOUR MODEL
        poll = Poll.objects.create(
            title=title,
            description=description,
            category=category,
            creator=request.user,  # Your model uses 'creator'
            expires_at=expires_at_obj  # Only set if provided and valid
        )
        
        # Create poll options - NO ORDER FIELD (your model doesn't have it)
        for option_text in options:
            if option_text.strip():
                PollOption.objects.create(
                    poll=poll,
                    text=option_text.strip()
                    # No 'order' field - your model doesn't have it
                )
        
        logger.info(f"Poll created successfully by {request.user.username}: {title}")
        
        return JsonResponse({
            'success': True,
            'message': 'Poll created successfully!',
            'poll': serialize_poll(poll, include_options=True)
        })
        
    except Exception as e:
        logger.error(f"Error creating poll: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Unable to create poll: {str(e)}'
        }, status=500)

@json_login_required
@require_http_methods(["GET"])
def poll_detail(request, poll_id):
    """Get detailed poll information"""
    try:
        poll = get_object_or_404(Poll, id=poll_id)
        
        return JsonResponse({
            'success': True,
            'poll': serialize_poll(poll, include_options=True)
        })
    except Exception as e:
        logger.error(f"Error loading poll detail: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Unable to load poll details'
        }, status=500)

# Add these methods to your views:

@json_login_required
def delete_poll(request, poll_id):
    """Delete a poll"""
    if request.method == 'DELETE':
        try:
            poll = Poll.objects.get(id=poll_id, created_by=request.user)
            poll.delete()
            return JsonResponse({'success': True, 'message': 'Poll deleted successfully'})
        except Poll.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Poll not found or unauthorized'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Invalid method'}, status=405)

@json_login_required
def update_poll(request, poll_id):
    """Update a poll"""
    if request.method == 'PUT':
        try:
            poll = Poll.objects.get(id=poll_id, created_by=request.user)
            
            data = json.loads(request.body)
            
            # Update poll fields
            poll.title = data.get('title', poll.title)
            poll.description = data.get('description', poll.description)
            poll.category = data.get('category', poll.category)
            poll.save()
            
            # Update options if provided
            if 'options' in data:
                # Delete existing options
                poll.polloption_set.all().delete()
                
                # Create new options
                for i, option_text in enumerate(data['options']):
                    PollOption.objects.create(
                        poll=poll,
                        text=option_text,
                        order=i
                    )
            
            return JsonResponse({
                'success': True, 
                'message': 'Poll updated successfully',
                'poll': {
                    'id': poll.id,
                    'title': poll.title,
                    'description': poll.description,
                    'category': poll.category
                }
            })
            
        except Poll.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Poll not found or unauthorized'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Invalid method'}, status=405)

def analytics_view(request):
    """Get analytics data"""
    try:
        total_polls = Poll.objects.count()
        total_votes = Vote.objects.count()
        active_polls = Poll.objects.filter(is_active=True).count()
        
        # Calculate average participation
        avg_participation = 0
        if total_polls > 0:
            avg_participation = round((total_votes / total_polls), 2)
        
        return JsonResponse({
            'totalPolls': total_polls,
            'totalVotes': total_votes,
            'activePollsCount': active_polls,
            'avgParticipation': avg_participation
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
@json_login_required
@require_http_methods(["POST"])
def vote_poll(request, poll_id):
    """Vote on a poll"""
    try:
        data = json.loads(request.body)
        option_id = data.get('option_id')
        
        if not option_id:
            return JsonResponse({
                'success': False,
                'error': 'Option ID is required'
            }, status=400)
        
        poll = get_object_or_404(Poll, id=poll_id)
        option = get_object_or_404(PollOption, id=option_id, poll=poll)
        
        # Check if user already voted
        existing_vote = Vote.objects.filter(poll=poll, user=request.user).first()
        if existing_vote:
            # Update existing vote
            existing_vote.option = option
            existing_vote.save()
            message = 'Vote updated successfully!'
        else:  # FIXED: Added proper indentation and else structure
            # Create new vote
            Vote.objects.create(
                poll=poll,
                option=option,
                user=request.user
            )
            message = 'Vote submitted successfully!'
        
        return JsonResponse({
            'success': True,
            'message': message,
            'poll': serialize_poll(poll, include_options=True)
        })
        
    except Exception as e:
        logger.error(f"Error voting on poll: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Unable to vote: {str(e)}'
        }, status=500)

@json_login_required
@require_http_methods(["PUT"])
def edit_poll(request, poll_id):
    """Edit a poll (only by creator)"""
    try:
        poll = get_object_or_404(Poll, id=poll_id, creator=request.user)
        data = json.loads(request.body)
        
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        category = data.get('category', '').strip()
        
        if not title:
            return JsonResponse({
                'success': False,
                'error': 'Poll title is required'
            }, status=400)
        
        # Update poll
        poll.title = title
        poll.description = description
        poll.category = category
        poll.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Poll updated successfully!',
            'poll': serialize_poll(poll, include_options=True)
        })
        
    except Poll.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Poll not found or you do not have permission to edit it'
        }, status=404)
    except Exception as e:
        logger.error(f"Error editing poll: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Unable to edit poll: {str(e)}'
        }, status=500)

@require_http_methods(["GET"])
def poll_results(request, poll_id):
    """Get poll results"""
    try:
        poll = get_object_or_404(Poll, id=poll_id)
        
        # Get detailed results
        options_with_votes = []
        total_votes = Vote.objects.filter(poll=poll).count()
        
        for option in poll.options.all():
            vote_count = Vote.objects.filter(option=option).count()
            percentage = (vote_count / total_votes * 100) if total_votes > 0 else 0
            
            options_with_votes.append({
                'id': option.id,
                'text': option.text,
                'vote_count': vote_count,
                'percentage': round(percentage, 1)
            })
        
        # Check if user has voted
        user_vote = None
        if request.user.is_authenticated:
            user_vote_obj = Vote.objects.filter(poll=poll, user=request.user).first()
            user_vote = user_vote_obj.option.id if user_vote_obj else None
        
        return JsonResponse({
            'success': True,
            'poll': serialize_poll(poll),
            'results': {
                'total_votes': total_votes,
                'options': options_with_votes,
                'user_vote': user_vote
            }
        })
        
    except Exception as e:
        logger.error(f"Error loading poll results: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Unable to load poll results'
        }, status=500)
# ADD THESE FUNCTIONS TO YOUR EXISTING VIEWS.PY

@require_http_methods(["GET"])
def detailed_statistics(request):
    """Detailed analytics endpoint that frontend expects"""
    try:
        # Basic stats
        total_polls = Poll.objects.count()
        total_votes = Vote.objects.count()
        active_polls = Poll.objects.filter(is_active=True).count()
        
        # Calculate completion rate (polls with at least one vote)
        polls_with_votes = Poll.objects.annotate(vote_count=Count('votes')).filter(vote_count__gt=0).count()
        completion_rate = round((polls_with_votes / total_polls * 100), 2) if total_polls > 0 else 0
        
        # Average votes per poll
        avg_votes_per_poll = round((total_votes / total_polls), 2) if total_polls > 0 else 0
        
        # Engagement rate (simplified)
        total_users = User.objects.count()
        users_who_voted = Vote.objects.values('user').distinct().count()
        engagement_rate = round((users_who_voted / total_users * 100), 2) if total_users > 0 else 0
        
        # Category distribution
        category_distribution = Poll.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        category_data = [
            {'name': cat['category'] or 'Uncategorized', 'count': cat['count']} 
            for cat in category_distribution
        ]
        
        return JsonResponse({
            'completionRate': completion_rate,
            'avgVotesPerPoll': avg_votes_per_poll,
            'engagementRate': engagement_rate,
            'categoryDistribution': category_data
        })
        
    except Exception as e:
        logger.error(f"Error loading detailed statistics: {e}")
        return JsonResponse({
            'error': 'Unable to load detailed statistics'
        }, status=500)

@require_http_methods(["GET"])
def top_polls(request):
    """Top polls by engagement that frontend expects"""
    try:
        # Get polls with vote counts
        polls = Poll.objects.annotate(
            vote_count=Count('votes')
        ).filter(vote_count__gt=0).order_by('-vote_count')[:10]
        
        top_polls_data = []
        for poll in polls:
            total_possible_votes = User.objects.count()  # Simplified engagement calculation
            participation_rate = round((poll.vote_count / total_possible_votes * 100), 2) if total_possible_votes > 0 else 0
            
            top_polls_data.append({
                'id': poll.id,
                'title': poll.title,
                'vote_count': poll.vote_count,
                'participation_rate': participation_rate
            })
        
        return JsonResponse({
            'topPolls': top_polls_data
        })
        
    except Exception as e:
        logger.error(f"Error loading top polls: {e}")
        return JsonResponse({
            'error': 'Unable to load top polls'
        }, status=500)

# UPDATE YOUR EXISTING poll_detail FUNCTION TO HANDLE PUT AND DELETE
@require_http_methods(["GET", "PUT", "DELETE"])
def poll_detail(request, poll_id):
    """Handle GET, PUT, and DELETE for individual polls"""
    try:
        poll = get_object_or_404(Poll, id=poll_id)
        
        if request.method == 'GET':
            return JsonResponse({
                'success': True,
                'poll': serialize_poll(poll, include_options=True)
            })
            
        elif request.method == 'PUT':
            # Only poll creator can update
            if not request.user.is_authenticated or poll.creator != request.user:
                return JsonResponse({
                    'success': False,
                    'error': 'Permission denied'
                }, status=403)
            
            data = json.loads(request.body)
            options = data.get('options', [])
            
            # Validate options
            if len(options) < 2:
                return JsonResponse({
                    'success': False,
                    'error': 'At least 2 options are required'
                }, status=400)
            
            # Update poll fields
            poll.title = data.get('title', poll.title)
            poll.description = data.get('description', poll.description)
            poll.category = data.get('category', poll.category)
            poll.save()
            
            # Update options if provided
            if options:
                # Delete existing options
                poll.options.all().delete()
                
                # Create new options
                for i, option_text in enumerate(options):
                    if option_text.strip():
                        PollOption.objects.create(
                            poll=poll,
                            text=option_text.strip()
                        )
            
            return JsonResponse({
                'success': True,
                'message': 'Poll updated successfully!',
                'poll': serialize_poll(poll, include_options=True)
            })
            
        elif request.method == 'DELETE':
            # Only poll creator can delete
            if not request.user.is_authenticated or poll.creator != request.user:
                return JsonResponse({
                    'success': False,
                    'error': 'Permission denied'
                }, status=403)
            
            poll.delete()
            return JsonResponse({
                'success': True,
                'message': 'Poll deleted successfully!'
            })
            
    except Poll.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Poll not found'
        }, status=404)
    except Exception as e:
        logger.error(f"Error in poll_detail view: {e}")
        return JsonResponse({
            'success': False,
            'error': f'Operation failed: {str(e)}'
        }, status=500)

# UPDATE YOUR analytics_data FUNCTION TO MATCH FRONTEND EXPECTATIONS
@require_http_methods(["GET"])
def analytics_data(request):
    """Get analytics data - updated to match frontend field names"""
    try:
        # Basic stats - using field names that frontend expects
        total_polls = Poll.objects.count()
        total_votes = Vote.objects.count()
        active_polls = Poll.objects.filter(is_active=True).count()
        
        # Calculate average participation
        avg_participation = 0
        if total_polls > 0:
            # Simplified calculation - you can enhance this
            avg_participation = round((total_votes / total_polls), 2)
        
        return JsonResponse({
            'totalPolls': total_polls,
            'totalVotes': total_votes,
            'activePollsCount': active_polls,
            'avgParticipation': avg_participation
        })
        
    except Exception as e:
        logger.error(f"Error loading analytics: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Unable to load analytics data'
        }, status=500)

@require_http_methods(["GET"])
def api_statistics(request):
    """Get user statistics for dashboard"""
    try:
        if not request.user.is_authenticated:
            return JsonResponse({
                'totalPolls': 0,
                'totalVotes': 0,
                'avgParticipation': 0,
                'activePollsCount': 0
            })
        
        # Get user's polls
        user_polls = Poll.objects.filter(creator=request.user)
        
        # Calculate statistics
        total_polls = user_polls.count()
        active_polls = user_polls.filter(is_active=True).count()
        
        # Get total votes on user's polls - with proper error handling
        try:
            total_votes = Vote.objects.filter(poll__creator=request.user).count()
        except:
            total_votes = 0
        
        # Calculate average participation
        if total_polls > 0 and total_votes > 0:
            avg_participation = min(100, round((total_votes / total_polls) * 10))
        else:
            avg_participation = 0
        
        return JsonResponse({
            'success': True,
            'totalPolls': total_polls,
            'totalVotes': total_votes,
            'avgParticipation': avg_participation,
            'activePollsCount': active_polls,
        })
        
    except Exception as e:
        print(f"Statistics API Error: {e}")  # Debug log
        return JsonResponse({
            'success': True,  # Return success with fallback data
            'totalPolls': 0,
            'totalVotes': 0,
            'avgParticipation': 0,
            'activePollsCount': 0,
            'error': f'Fallback data: {str(e)}'
        })

@require_http_methods(["GET"])
def analytics_data(request):
    """Get analytics data"""
    try:
        # Basic stats
        total_polls = Poll.objects.count()
        total_votes = Vote.objects.count()
        active_polls = Poll.objects.filter(is_active=True).count()
        
        # User-specific stats if logged in
        user_polls_count = 0
        user_votes_count = 0
        if request.user.is_authenticated:
            user_polls_count = Poll.objects.filter(creator=request.user).count()
            user_votes_count = Vote.objects.filter(user=request.user).count()
        
        # Recent activity (last 7 days)
        from datetime import datetime, timedelta
        week_ago = timezone.now() - timedelta(days=7)
        recent_polls = Poll.objects.filter(created_at__gte=week_ago).count()
        recent_votes = Vote.objects.filter(created_at__gte=week_ago).count()
        
        # Category breakdown
        category_stats = Poll.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Popular polls (most voted)
        popular_polls = []
        for poll in Poll.objects.all()[:5]:
            vote_count = Vote.objects.filter(poll=poll).count()
            popular_polls.append({
                'id': poll.id,
                'title': poll.title,
                'vote_count': vote_count
            })
        
        popular_polls.sort(key=lambda x: x['vote_count'], reverse=True)
        
        return JsonResponse({
            'success': True,
            'analytics': {
                'overview': {
                    'total_polls': total_polls,
                    'total_votes': total_votes,
                    'active_polls': active_polls,
                    'user_polls': user_polls_count,
                    'user_votes': user_votes_count
                },
                'recent_activity': {
                    'polls_this_week': recent_polls,
                    'votes_this_week': recent_votes
                },
                'categories': list(category_stats),
                'popular_polls': popular_polls[:5]
            }
        })
        
    except Exception as e:  # FIXED: Added missing except block
        logger.error(f"Error loading analytics: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Unable to load analytics data'
        }, status=500)
        
        