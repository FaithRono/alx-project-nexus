from django.contrib import admin
from .models import Poll, Option, Vote


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    """
    Admin interface for Poll model with optimized display and filtering
    """
    list_display = ['title', 'created_at', 'expires_at', 'is_active', 'total_votes']
    list_filter = ['is_active', 'created_at', 'expires_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'total_votes']
    
    def total_votes(self, obj):
        return obj.total_votes
    total_votes.short_description = 'Total Votes'


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    """
    Admin interface for Option model
    """
    list_display = ['text', 'poll', 'order', 'vote_count']
    list_filter = ['poll']
    search_fields = ['text', 'poll__title']
    
    def vote_count(self, obj):
        return obj.vote_count
    vote_count.short_description = 'Vote Count'


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    """
    Admin interface for Vote model
    """
    list_display = ['option', 'poll', 'voter_ip', 'voted_at']
    list_filter = ['voted_at', 'option__poll']
    search_fields = ['option__text', 'option__poll__title']
    readonly_fields = ['voted_at']
    
    def poll(self, obj):
        return obj.poll.title
    poll.short_description = 'Poll'