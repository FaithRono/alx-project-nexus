pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'poll-system'
        DOCKER_TAG = "${BUILD_NUMBER}"
        REGISTRY = 'your-registry.com'
        K8S_NAMESPACE = 'poll-system'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Setup Python Environment') {
            steps {
                sh '''
                    python -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                '''
            }
        }
        
        stage('Code Quality Checks') {
            parallel {
                stage('Linting') {
                    steps {
                        sh '''
                            . venv/bin/activate
                            pip install flake8
                            flake8 polls/ poll_system/ --max-line-length=100 --exclude=migrations
                        '''
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh '''
                            . venv/bin/activate
                            pip install bandit
                            bandit -r polls/ poll_system/ -f json -o bandit-report.json
                        '''
                        publishHTML([
                            allowMissing: false,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: '.',
                            reportFiles: 'bandit-report.json',
                            reportName: 'Security Report'
                        ])
                    }
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                sh '''
                    . venv/bin/activate
                    export DJANGO_SETTINGS_MODULE=poll_system.settings
                    export DEBUG=True
                    export SECRET_KEY=test-secret-key
                    export DB_NAME=:memory:
                    export DB_ENGINE=django.db.backends.sqlite3
                    python manage.py test --verbosity=2 --keepdb
                '''
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishCoverage adapters: [coberturaAdapter('coverage.xml')], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    docker.build("${DOCKER_IMAGE}:${DOCKER_TAG}")
                    docker.build("${DOCKER_IMAGE}:latest")
                }
            }
        }
        
        stage('Docker Security Scan') {
            steps {
                sh '''
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                        -v $PWD:/tmp/.cache/ aquasec/trivy:latest image \
                        --exit-code 0 --no-progress --format table \
                        ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh '''
                    docker-compose -f docker-compose.test.yml up -d
                    sleep 30
                    docker-compose -f docker-compose.test.yml exec -T web python manage.py test polls.tests
                '''
            }
            post {
                always {
                    sh 'docker-compose -f docker-compose.test.yml down -v'
                }
            }
        }
        
        stage('Push to Registry') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    docker.withRegistry("https://${REGISTRY}", 'registry-credentials') {
                        docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                        docker.image("${DOCKER_IMAGE}:latest").push()
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    kubernetesDeploy(
                        configs: 'k8s/*.yaml',
                        kubeconfigId: 'k8s-staging-config',
                        enableConfigSubstitution: true
                    )
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                script {
                    kubernetesDeploy(
                        configs: 'k8s/*.yaml',
                        kubeconfigId: 'k8s-production-config',
                        enableConfigSubstitution: true
                    )
                }
            }
        }
        
        stage('Health Check') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    def healthCheckUrl = branch == 'main' ? 
                        'https://poll-system.production.com/api/v1/statistics/' : 
                        'https://poll-system.staging.com/api/v1/statistics/'
                    
                    sh """
                        for i in {1..5}; do
                            if curl -f ${healthCheckUrl}; then
                                echo "Health check passed"
                                exit 0
                            else
                                echo "Health check failed, attempt \$i/5"
                                sleep 10
                            fi
                        done
                        exit 1
                    """
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            sh 'docker system prune -f'
        }
        
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ Poll System deployment successful - Branch: ${env.BRANCH_NAME}, Build: ${env.BUILD_NUMBER}"
            )
        }
        
        failure {
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "❌ Poll System deployment failed - Branch: ${env.BRANCH_NAME}, Build: ${env.BUILD_NUMBER}"
            )
        }
    }
}