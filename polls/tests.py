from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Poll, Option, Vote


class PollModelTest(TestCase):
    """
    Test cases for Poll model functionality
    """
    
    def setUp(self):
        self.poll = Poll.objects.create(
            title="Test Poll",
            description="A test poll"
        )
        self.option1 = Option.objects.create(poll=self.poll, text="Option 1", order=1)
        self.option2 = Option.objects.create(poll=self.poll, text="Option 2", order=2)
    
    def test_poll_creation(self):
        """Test poll is created correctly"""
        self.assertEqual(self.poll.title, "Test Poll")
        self.assertTrue(self.poll.is_active)
        self.assertEqual(self.poll.options.count(), 2)
    
    def test_poll_results(self):
        """Test poll results calculation"""
        Vote.objects.create(option=self.option1, voter_ip="127.0.0.1", voter_session="test1")
        Vote.objects.create(option=self.option1, voter_ip="127.0.0.2", voter_session="test2")
        Vote.objects.create(option=self.option2, voter_ip="127.0.0.3", voter_session="test3")
        
        results = self.poll.get_results()
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['votes'], 2)
        self.assertEqual(results[1]['votes'], 1)


class PollAPITest(APITestCase):
    """
    Test cases for Poll API endpoints
    """
    
    def setUp(self):
        self.poll = Poll.objects.create(
            title="API Test Poll",
            description="Test poll for API"
        )
        Option.objects.create(poll=self.poll, text="Option A", order=1)
        Option.objects.create(poll=self.poll, text="Option B", order=2)
    
    def test_poll_list(self):
        """Test poll list endpoint"""
        url = reverse('poll-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_poll_creation(self):
        """Test poll creation endpoint"""
        url = reverse('poll-create')
        data = {
            'title': 'New Test Poll',
            'description': 'Created via API',
            'options': ['Choice 1', 'Choice 2', 'Choice 3']
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Poll.objects.count(), 2)
    
    def test_voting(self):
        """Test voting functionality"""
        option = self.poll.options.first()
        url = reverse('vote-create')
        data = {'option': option.id}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Vote.objects.count(), 1)