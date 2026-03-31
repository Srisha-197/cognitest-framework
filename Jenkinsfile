pipeline {
    agent any

    environment {
        IMAGE_NAME = "cognitest"
        IMAGE_TAG = "${BUILD_NUMBER}"
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
                withCredentials([
                    string(credentialsId: 'jira-url', variable: 'JIRA_BASE_URL'),
                    string(credentialsId: 'jira-email', variable: 'JIRA_EMAIL'),
                    string(credentialsId: 'jira-token', variable: 'JIRA_API_TOKEN'),
                    string(credentialsId: 'jira-project', variable: 'JIRA_PROJECT_KEY'),
                    string(credentialsId: 'JIRA_ACCOUNT_ID', variable: 'JIRA_ACCOUNT_ID'),
                    string(credentialsId: 'API_BASE_URL', variable: 'API_BASE_URL')
                ]) {
                    sh '''
                    echo "Running tests..."

                    mkdir -p reports/allure-results

                    docker run --rm \
                      --name cognitest-container \
                      -v "$(pwd)/reports/allure-results:/app/reports/allure-results" \
                      -e JIRA_BASE_URL=$JIRA_BASE_URL \
                      -e JIRA_EMAIL=$JIRA_EMAIL \
                      -e JIRA_API_TOKEN=$JIRA_API_TOKEN \
                      -e JIRA_PROJECT_KEY=$JIRA_PROJECT_KEY \
                      -e JIRA_ACCOUNT_ID=$JIRA_ACCOUNT_ID \
                      -e API_BASE_URL=$API_BASE_URL \
                      ${IMAGE_NAME}:${IMAGE_TAG} \
                      npm run test:ci
                    '''
                }
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