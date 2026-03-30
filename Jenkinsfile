pipeline {

    agent any

    environment {
        IMAGE_NAME = "cognitest"
        CONTAINER_NAME = "cognitest-container"
    }

    stages {

        stage('Clean Workspace') {
            steps { cleanWs() }
        }

        stage('Checkout Code') {
            steps { checkout scm }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .'
            }
        }

        stage('Run Tests in Docker') {
            steps {
                sh '''
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
                echo "Checking results..."
                ls -R reports/allure-results || true
                '''
            }
        }

        stage('Publish Allure Report') {
            steps {
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
    }
}
