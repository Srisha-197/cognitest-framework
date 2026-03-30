pipeline {

    agent any

    environment {
        IMAGE_NAME = "cognitest"
        CONTAINER_NAME = "cognitest-container"
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        // ❌ NO checkout stage here (Jenkins already does it)
        stage('Force Clean Git') {
    steps {
        sh '''
        rm -rf .git || true
        '''
    }
}

        stage('Build Docker Image') {
            steps {
                sh '''
                echo "Building Docker image..."
                docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                '''
            }
        }

        stage('Run Tests in Docker') {
            steps {
                sh '''
                echo "Running tests inside container..."

                mkdir -p reports/allure-results

                docker run --rm \
                  --name ${CONTAINER_NAME} \
                  -v $(pwd)/reports/allure-results:/app/reports/allure-results \
                  ${IMAGE_NAME}:${BUILD_NUMBER} \
                  npm run test
                '''
            }
        }

        stage('Verify Allure Results') {
            steps {
                sh '''
                echo "Checking Allure results..."
                ls -R reports/allure-results || true
                '''
            }
        }

        stage('Publish Allure Report') {
            steps {
                echo "Publishing Allure report..."
                allure([
                    includeProperties: false,
                    results: [[path: 'reports/allure-results']]
                ])
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            }
        }
    }

    post {
        always {
            echo 'Pipeline completed'
        }
        success {
            echo 'SUCCESS: Tests executed and report generated'
        }
        failure {
            echo 'FAILED: Check logs'
        }
    }
}
