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

        stage('Clean Reports') {
            steps {
                sh '''
                echo "Cleaning old reports..."
                rm -rf reports/allure-results || true
                mkdir -p reports/allure-results
                '''
            }
        }

        stage('Run Tests in Docker') {
            steps {
                withCredentials([
                    string(credentialsId: 'jira-url', variable: 'JIRA_BASE_URL'),
                    string(credentialsId: 'jira-email', variable: 'JIRA_EMAIL'),
                    string(credentialsId: 'jira-token', variable: 'JIRA_API_TOKEN'),
                    string(credentialsId: 'jira-project', variable: 'JIRA_PROJECT_KEY')
                ]) {
                    sh '''
                    echo "Running tests..."

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
                script {
                    echo "Publishing Allure report..."
                }
                // NOTE: Requires Allure plugin installed
                allure([
                    results: [[path: 'reports/allure-results']]
                ])
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