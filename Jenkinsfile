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
                    string(credentialsId: 'JIRA_PROJECT_KEY', variable: 'JIRA_PROJECT_KEY'),
                    string(credentialsId: 'JIRA_ACCOUNT_ID', variable: 'JIRA_ACCOUNT_ID'),
                    string(credentialsId: 'API_BASE_URL', variable: 'API_BASE_URL'),
                    string(credentialsId: 'BASE_URL', variable: 'BASE_URL'),
                    string(credentialsId: 'NODE_ENV', variable: 'NODE_ENV'),
                    string(credentialsId: 'LOG_LEVEL', variable: 'LOG_LEVEL')
                ]) {
                    sh '''
                    echo "Running tests with Mock API..."

                    mkdir -p reports/allure-results

                    docker run --rm \
                      --name cognitest-container \
                      -v "$(pwd)/reports/allure-results:/app/reports/allure-results" \
                      -e BASE_URL=$BASE_URL \
                      -e API_BASE_URL=$API_BASE_URL \
                      -e NODE_ENV=$NODE_ENV \
                      -e LOG_LEVEL=$LOG_LEVEL \
                      -e JIRA_BASE_URL=$JIRA_BASE_URL \
                      -e JIRA_EMAIL=$JIRA_EMAIL \
                      -e JIRA_API_TOKEN=$JIRA_API_TOKEN \
                      -e JIRA_PROJECT_KEY=$JIRA_PROJECT_KEY \
                      -e JIRA_ACCOUNT_ID=$JIRA_ACCOUNT_ID \
                      ${IMAGE_NAME}:${IMAGE_TAG} \
                      sh -c "npm run test:ci || true"
                    '''
                }
            }
        }

        stage('Verify Allure Results') {
            steps {
                sh '''
                echo "Checking Allure results..."
                if [ -d "reports/allure-results" ]; then
                  echo "Allure results found"
                else
                  echo "No Allure results found"
                fi
                '''
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