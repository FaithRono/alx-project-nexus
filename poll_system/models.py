from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Poll(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE)  # 🔑 Key ownership field
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    category = models.CharField(max_length=50, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def can_edit(self, user):
        return self.creator == user
    
    def can_delete(self, user):
        return self.creator == user
    
    @property
    def total_votes(self):
        return self.votes.count()
    
    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

class PollOption(models.Model):
    poll = models.ForeignKey(Poll, related_name='options', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.poll.title} - {self.text}"
    
    @property
    def vote_count(self):
        return self.votes.count()
    
    @property
    def vote_percentage(self):
        total_votes = self.poll.total_votes
        if total_votes == 0:
            return 0
        return round((self.vote_count / total_votes) * 100, 1)

class Vote(models.Model):
    poll = models.ForeignKey(Poll, related_name='votes', on_delete=models.CASCADE)
    option = models.ForeignKey(PollOption, related_name='votes', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        unique_together = ('poll', 'user')  # Prevent duplicate votes
    
    def __str__(self):
        return f"{self.user.username} voted on {self.poll.title}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    total_polls_created = models.IntegerField(default=0)
    total_votes_cast = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"