def gitBranch = env.BRANCH_NAME
def gitURL = "git@github.com:Memphisdev/memphis.js.git"
def repoUrlPrefix = "memphisos"

node ("small-ec2-fleet") {
  git credentialsId: 'main-github', url: gitURL, branch: gitBranch
  
  try{
   stage('Push to NPM') {
      sh 'sudo npm install'
      withCredentials([string(credentialsId: 'npm_token', variable: 'npm_token')]) {
       sh "echo //registry.npmjs.org/:_authToken=$npm_token > .npmrc"
       sh 'npm publish'
      }
    }
    
    stage('Checkout to version branch'){
      sh(script:"""jq -r '"v" + .version' package.json > version.conf""", returnStdout: true)
      withCredentials([sshUserPrivateKey(keyFileVariable:'check',credentialsId: 'main-github')]) {
        sh "git reset --hard origin/latest"
        sh "GIT_SSH_COMMAND='ssh -i $check'  git checkout -b \$(cat version.conf)"
        sh "GIT_SSH_COMMAND='ssh -i $check' git push --set-upstream origin \$(cat version.conf)"
      }
    }
    
    notifySuccessful()

  } catch (e) {
      currentBuild.result = "FAILED"
      cleanWs()
      notifyFailed()
      throw e
  }
}

def notifySuccessful() {
  emailext (
      subject: "SUCCESSFUL: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
      body: """<p>SUCCESSFUL: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]':</p>
        <p>Check console output at &QUOT;<a href='${env.BUILD_URL}'>${env.JOB_NAME} [${env.BUILD_NUMBER}]</a>&QUOT;</p>""",
      recipientProviders: [[$class: 'DevelopersRecipientProvider']]
    )
}

def notifyFailed() {
  emailext (
      subject: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]'",
      body: """<p>FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]':</p>
        <p>Check console output at &QUOT;<a href='${env.BUILD_URL}'>${env.JOB_NAME} [${env.BUILD_NUMBER}]</a>&QUOT;</p>""",
      recipientProviders: [[$class: 'DevelopersRecipientProvider']]
    )
}
