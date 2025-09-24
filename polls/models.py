from django.db import models
from django.core.validators import MinLengthValidator
from django.utils import timezone
from django.contrib.auth.models import User


class Poll(models.Model):
    """
    Model representing a poll with multiple options
    Optimized for MySQL with proper indexing for efficient queries
    """
    title = models.CharField(
        max_length=200, 
        validators=[MinLengthValidator(5)],
        help_text="Poll title must be at least 5 characters"
    )
    description = models.TextField(
        blank=True, 
        null=True,
        help_text="Optional detailed description of the poll"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when poll was created"
    )
    expires_at = models.DateTimeField(
        null=True, 
        blank=True,
        db_index=True,
        help_text="Optional expiration date for the poll"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether the poll is currently accepting votes"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='polls',
        null=True,
        blank=True,
        help_text="User who created the poll"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['expires_at', 'is_active']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_expired(self):
        """Check if poll has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    @property
    def total_votes(self):
        """Get total number of votes for this poll"""
        return Vote.objects.filter(option__poll=self).count()

    def get_results(self):
        """Get poll results with vote counts for each option"""
        options = self.options.all()
        results = []
        
        for option in options:
            vote_count = option.votes.count()
            percentage = (vote_count / self.total_votes * 100) if self.total_votes > 0 else 0
            results.append({
                'option_id': option.id,
                'text': option.text,
                'votes': vote_count,
                'percentage': round(percentage, 2)
            })
        
        return results


class Option(models.Model):
    """
    Model representing poll options
    Each poll can have multiple options for users to vote on
    """
    poll = models.ForeignKey(
        Poll,
        on_delete=models.CASCADE,
        related_name='options',
        help_text="Poll this option belongs to"
    )
    text = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(2)],
        help_text="Option text must be at least 2 characters"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of the option"
    )

    class Meta:
        ordering = ['order', 'id']
        unique_together = ['poll', 'text']
        indexes = [
            models.Index(fields=['poll', 'order']),
        ]

    def __str__(self):
        return f"{self.poll.title} - {self.text}"

    @property
    def vote_count(self):
        """Get number of votes for this option"""
        return self.votes.count()


class Vote(models.Model):
    """
    Model representing individual votes
    Optimized to prevent duplicate voting and enable efficient counting
    """
    option = models.ForeignKey(
        Option,
        on_delete=models.CASCADE,
        related_name='votes',
        help_text="Option that was voted for"
    )
    voter_ip = models.GenericIPAddressField(
        help_text="IP address of the voter for duplicate prevention"
    )
    voter_session = models.CharField(
        max_length=40,
        help_text="Session key for duplicate prevention"
    )
    voted_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when vote was cast"
    )

    class Meta:
        # Prevent duplicate voting from same IP/session for same option
        unique_together = ['option', 'voter_ip', 'voter_session']
        indexes = [
            models.Index(fields=['option', 'voted_at']),
            models.Index(fields=['voter_ip', 'voter_session']),
        ]

    def __str__(self):
        return f"Vote for {self.option.text} at {self.voted_at}"

    @property
    def poll(self):
        """Get the poll this vote belongs to"""
        return self.option.poll