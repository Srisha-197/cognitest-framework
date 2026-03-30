pipeline {
    agent any

    environment {
        IMAGE_NAME = "cognitest"
        IMAGE_TAG = "${BUILD_NUMBER}"

        //Secure credentials from Jenkins
        JIRA_BASE_URL = credentials('jira-url')
        JIRA_EMAIL    = credentials('jira-email')
        JIRA_API_TOKEN = credentials('jira-token')

        //REQUIRED (add your Jira project key)
        JIRA_PROJECT_KEY = "TEST"
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
                  -e JIRA_BASE_URL="$JIRA_BASE_URL" \
                  -e JIRA_EMAIL="$JIRA_EMAIL" \
                  -e JIRA_API_TOKEN="$JIRA_API_TOKEN" \
                  -e JIRA_PROJECT_KEY="$JIRA_PROJECT_KEY" \
                  ${IMAGE_NAME}:${IMAGE_TAG} \
                  npm run test || true
                '''
            }
        }

        stage('Verify Allure Results') {
            steps {
                sh '''
                echo "Checking Allure results..."

                if [ -d "reports/allure-results" ] && [ "$(ls -A reports/allure-results)" ]; then
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
        success {
            echo "SUCCESS"
        }
        failure {
            echo "FAILED"
        }
    }
}
