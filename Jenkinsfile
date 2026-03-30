pipeline {
    agent any

    environment {
        IMAGE_NAME = "cognitest"
        IMAGE_TAG = "${BUILD_NUMBER}"

        // ✅ Add required environment variables
        JIRA_BASE_URL = "https://your-domain.atlassian.net"
        JIRA_EMAIL = "your-email@example.com"
        JIRA_API_TOKEN = "your-api-token"
    }

    stages {

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker image..."
                docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                '''
            }
        }

        stage('Run Tests in Docker') {
            steps {
                sh '''
                echo "Running tests..."

                mkdir -p reports/allure-results

                docker run --rm \
                  --name cognitest-container \
                  -v "$(pwd)/reports/allure-results:/app/reports/allure-results" \
                  -e JIRA_BASE_URL=$JIRA_BASE_URL \
                  -e JIRA_EMAIL=$JIRA_EMAIL \
                  -e JIRA_API_TOKEN=$JIRA_API_TOKEN \
                  ${IMAGE_NAME}:${IMAGE_TAG} \
                  npm run test
                '''
            }
        }

        stage('Verify Allure Results') {
            steps {
                sh '''
                if [ -d "reports/allure-results" ]; then
                  echo "Allure results found"
                else
                  echo "No Allure results found"
                  exit 1
                fi
                '''
            }
        }

        stage('Publish Allure Report') {
            steps {
                allure includeProperties: false,
                       jdk: '',
                       results: [[path: 'reports/allure-results']]
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'reports/**', fingerprint: true
            }
        }
    }

    post {
        always {
            echo "Pipeline completed"
        }
        failure {
            echo "FAILED"
        }
    }
}
