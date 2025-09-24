# Online Poll System Backend

A comprehensive REST API backend for managing online polls with real-time voting capabilities, built with Django and optimized for MySQL database.

## 🚀 Features

- **Poll Management**: Create polls with multiple options and optional expiration dates
- **Real-time Voting**: Cast votes with duplicate prevention mechanisms
- **Result Computation**: Efficient real-time calculation of poll results and statistics
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Scalable Architecture**: Containerized with Docker and Kubernetes support
- **CI/CD Pipeline**: Automated testing and deployment with Jenkins

## 🛠 Technology Stack

- **Framework**: Django 4.2.7 with Django REST Framework
- **Database**: MySQL 8.0 with optimized indexing
- **Documentation**: drf-spectacular (Swagger/OpenAPI)
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes with auto-scaling
- **CI/CD**: Jenkins with automated testing and deployment
- **Web Server**: Gunicorn with Nginx reverse proxy

## 📋 Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Kubernetes cluster (for production deployment)
- Jenkins (for CI/CD pipeline)

## 🚀 Quick Start

### Local Development with Docker Compose

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/poll-system.git
   cd poll-system
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit environment variables
   nano .env
   ```

3. **Build and Run**
   ```bash
   # Build and start all services
   docker-compose up --build -d
   
   # Run database migrations
   docker-compose exec web python manage.py migrate
   
   # Create superuser (optional)
   docker-compose exec web python manage.py createsuperuser
   ```

4. **Access the Application**
   - API Base URL: `http://localhost:8000/api/v1/`
   - Swagger Documentation: `http://localhost:8000/api/docs/`
   - Admin Panel: `http://localhost:8000/admin/`

### Manual Setup (Development)

1. **Python Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Database Setup**
   ```bash
   # Install MySQL and create database
   mysql -u root -p
   CREATE DATABASE poll_system CHARACTER SET utf8mb4;
   CREATE USER 'poll_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON poll_system.* TO 'poll_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Environment Variables**
   ```bash
   export SECRET_KEY="your-secret-key"
   export DEBUG=True
   export DB_NAME=poll_system
   export DB_USER=poll_user
   export DB_PASSWORD=your_password
   export DB_HOST=localhost
   export DB_PORT=3306
   ```

4. **Run Migrations and Start Server**
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Debug mode | `False` |
| `DB_NAME` | Database name | `poll_system` |
| `DB_USER` | Database user | `poll_user` |
| `DB_PASSWORD` | Database password | Required |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `ALLOWED_HOSTS` | Allowed hosts | `localhost,127.0.0.1` |

### Database Optimization

The MySQL database is optimized with:
- Proper indexing on frequently queried fields
- Composite indexes for complex queries
- Unique constraints for duplicate vote prevention
- Connection pooling for improved performance

## 📚 API Documentation

### Core Endpoints

#### Polls

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/polls/` | List all active polls |
| `POST` | `/api/v1/polls/create/` | Create a new poll |
| `GET` | `/api/v1/polls/{id}/` | Get poll details |
| `GET` | `/api/v1/polls/{id}/results/` | Get poll results |

#### Voting

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/vote/` | Cast a vote |

#### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/statistics/` | Get system statistics |

### Example API Usage

#### Create a Poll
```bash
curl -X POST http://localhost:8000/api/v1/polls/create/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Favorite Programming Language",
    "description": "Vote for your favorite programming language",
    "expires_at": "2024-12-31T23:59:59Z",
    "options": ["Python", "JavaScript", "Java", "Go", "Rust"]
  }'
```

#### Cast a Vote
```bash
curl -X POST http://localhost:8000/api/v1/vote/ \
  -H "Content-Type: application/json" \
  -d '{
    "option": 1
  }'
```

#### Get Poll Results
```bash
curl http://localhost:8000/api/v1/polls/1/results/
```

## 🐳 Docker Deployment

### Production Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Scale web instances
docker-compose -f docker-compose.prod.yml up --scale web=3 -d
```

### Docker Build Options

```bash
# Build with specific tag
docker build -t poll-system:v1.0.0 .

# Multi-stage build for production
docker build --target production -t poll-system:latest .
```

## ☸️ Kubernetes Deployment

### Deploy to Kubernetes

1. **Create Namespace and Secrets**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   ```

2. **Deploy Database**
   ```bash
   kubectl apply -f k8s/mysql-init-config.yaml
   kubectl apply -f k8s/mysql.yaml
   ```

3. **Deploy Application**
   ```bash
   kubectl apply -f k8s/app.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

### Monitoring and Scaling

```bash
# Check deployment status
kubectl get pods -n poll-system

# Scale deployment
kubectl scale deployment poll-system-deployment --replicas=5 -n poll-system

# Check HPA status
kubectl get hpa -n poll-system
```

## 🔄 CI/CD Pipeline

### Jenkins Pipeline Features

- **Code Quality**: Linting and security scanning with Bandit
- **Testing**: Automated unit and integration tests
- **Security**: Docker image vulnerability scanning with Trivy
- **Deployment**: Automated deployment to staging and production
- **Health Checks**: Post-deployment health verification
- **Notifications**: Slack integration for deployment status

### Pipeline Stages

1. **Checkout**: Source code retrieval
2. **Setup**: Python environment preparation
3. **Quality Checks**: Code linting and security analysis
4. **Testing**: Unit and integration tests
5. **Build**: Docker image creation
6. **Security Scan**: Container vulnerability assessment
7. **Deploy**: Environment-specific deployment
8. **Health Check**: Application health verification

## 🧪 Testing

### Run Tests Locally

```bash
# Unit tests
python manage.py test

# With coverage
coverage run manage.py test
coverage report
coverage html

# Integration tests with Docker
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Test Structure

- **Unit Tests**: Model and API endpoint testing
- **Integration Tests**: Full system testing with database
- **Performance Tests**: Load testing for scalability
- **Security Tests**: Authentication and authorization testing

## 📊 Performance Considerations

### Database Optimization

- **Indexing**: Strategic indexes on frequently queried fields
- **Query Optimization**: Efficient vote counting with aggregations
- **Connection Pooling**: Optimized database connections
- **Caching**: Redis integration for session management

### Application Performance

- **Pagination**: Efficient data retrieval with pagination
- **Serialization**: Optimized DRF serializers
- **Background Tasks**: Celery integration for heavy operations
- **Static Files**: CDN integration for static content

## 🔒 Security Features

- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Django ORM protection
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: API rate limiting implementation
- **Duplicate Vote Prevention**: IP and session-based protection

## 📈 Monitoring and Logging

### Application Monitoring

- **Health Checks**: Kubernetes liveness and readiness probes
- **Metrics**: Prometheus integration for system metrics
- **Logging**: Structured logging with log aggregation
- **Error Tracking**: Sentry integration for error monitoring

### Database Monitoring

- **Performance Metrics**: MySQL performance monitoring
- **Query Analysis**: Slow query identification
- **Connection Monitoring**: Database connection tracking

## 🚦 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec web python manage.py dbshell

# Reset database
docker-compose down -v
docker-compose up -d
```

#### Migration Issues
```bash
# Reset migrations
docker-compose exec web python manage.py migrate --fake-initial
```

#### Performance Issues
```bash
# Check database indexes
docker-compose exec web python manage.py dbshell
SHOW INDEX FROM polls_poll;
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all CI/CD checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Documentation**: Check the API docs at `/api/docs/`
- **Issues**: Create an issue on GitHub
- **Email**: support@poll-system.com

## 🗺 Roadmap

- [ ] Real-time WebSocket updates for live results
- [ ] Advanced analytics and reporting
- [ ] User authentication and authorization
- [ ] Poll templates and categories
- [ ] Export functionality (PDF, Excel)
- [ ] Multi-language support
- [ ] Advanced security features (2FA, OAuth)

---

**Built with ❤️ for ALX Project Nexus**