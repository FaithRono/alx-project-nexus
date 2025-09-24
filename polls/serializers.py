from rest_framework import serializers
from .models import Poll, Option, Vote
from django.utils import timezone


class OptionSerializer(serializers.ModelSerializer):
    """
    Serializer for Option model with vote count
    """
    vote_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Option
        fields = ['id', 'text', 'order', 'vote_count']


class PollListSerializer(serializers.ModelSerializer):
    """
    Serializer for Poll list view with basic information
    """
    total_votes = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = Poll
        fields = ['id', 'title', 'description', 'created_at', 'expires_at', 
                 'is_active', 'is_expired', 'total_votes']


class PollDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for Poll detail view with options and results
    """
    options = OptionSerializer(many=True, read_only=True)
    total_votes = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    results = serializers.SerializerMethodField()
    
    class Meta:
        model = Poll
        fields = ['id', 'title', 'description', 'created_at', 'expires_at', 
                 'is_active', 'is_expired', 'total_votes', 'options', 'results']
    
    def get_results(self, obj):
        """Get poll results if requested"""
        request = self.context.get('request')
        if request and request.query_params.get('include_results', '').lower() == 'true':
            return obj.get_results()
        return None


class PollCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new polls with options
    """
    options = serializers.ListField(
        child=serializers.CharField(max_length=200, min_length=2),
        min_length=2,
        max_length=10,
        write_only=True,
        help_text="List of option texts (2-10 options required)"
    )
    
    class Meta:
        model = Poll
        fields = ['title', 'description', 'expires_at', 'options']
    
    def validate_expires_at(self, value):
        """Validate expiration date is in the future"""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future")
        return value
    
    def validate_options(self, value):
        """Validate options are unique and meet requirements"""
        if len(set(value)) != len(value):
            raise serializers.ValidationError("All options must be unique")
        return value
    
    def create(self, validated_data):
        """Create poll with options"""
        options_data = validated_data.pop('options')
        poll = Poll.objects.create(**validated_data)
        
        for index, option_text in enumerate(options_data):
            Option.objects.create(
                poll=poll,
                text=option_text,
                order=index
            )
        
        return poll


class VoteSerializer(serializers.ModelSerializer):
    """
    Serializer for casting votes
    """
    poll_id = serializers.ReadOnlyField(source='option.poll.id')
    poll_title = serializers.ReadOnlyField(source='option.poll.title')
    option_text = serializers.ReadOnlyField(source='option.text')
    
    class Meta:
        model = Vote
        fields = ['id', 'option', 'poll_id', 'poll_title', 'option_text', 'voted_at']
        read_only_fields = ['voted_at']
    
    def validate_option(self, value):
        """Validate option belongs to active poll"""
        if not value.poll.is_active:
            raise serializers.ValidationError("This poll is no longer active")
        
        if value.poll.is_expired:
            raise serializers.ValidationError("This poll has expired")
        
        return value
    
    def create(self, validated_data):
        """Create vote with IP and session tracking"""
        request = self.context['request']
        
        # Get client IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        # Get session key
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        
        validated_data['voter_ip'] = ip
        validated_data['voter_session'] = session_key
        
        return super().create(validated_data)


class PollResultsSerializer(serializers.Serializer):
    """
    Serializer for poll results
    """
    poll_id = serializers.IntegerField()
    poll_title = serializers.CharField()
    total_votes = serializers.IntegerField()
    results = serializers.ListField(
        child=serializers.DictField()
    )