def gitBranch = env.BRANCH_NAME
def gitURL = "git@github.com:Memphisdev/memphis.js.git"
def repoUrlPrefix = "memphisos"

node ("small-ec2-fleet") {
  git credentialsId: 'main-github', url: gitURL, branch: gitBranch
 
  try{
    
   stage('Install NPM') {
      sh """
        curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
        sudo yum install -y nodejs
      """
    }

   if (env.BRANCH_NAME == 'master') {
     stage('Push to NPM') {
       sh """
         sed -i -r "s/version\\": \\"[0-9].[0-9].[0-9]/version\\": \\"\$(cat version-beta.conf)/g" ./package.json
         sed -i -r "s/memphis-dev/memphis-dev-beta/g" ./package.json
         sudo npm install
       """
       withCredentials([string(credentialsId: 'npm_token', variable: 'npm_token')]) {
         sh "echo //registry.npmjs.org/:_authToken=$npm_token > .npmrc"
         sh 'npm publish'
       }
     }
   }
   else {
     stage('Push to NPM') {
       sh 'sudo npm install'
       withCredentials([string(credentialsId: 'npm_token', variable: 'npm_token')]) {
         sh "echo //registry.npmjs.org/:_authToken=$npm_token > .npmrc"
         sh 'npm publish'
       }
     }
    
     stage('Checkout to version branch'){
       sh 'sudo yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo'
       sh 'sudo yum install gh -y'
       sh 'sudo yum install jq -y'
       sh(script:"""sed -i -r "s/version\\": \\"[0-9].[0-9].[0-9]/version\\": \\"\$(cat version.conf)/g" ./package.json""", returnStdout: true)
       withCredentials([sshUserPrivateKey(keyFileVariable:'check',credentialsId: 'main-github')]) {
         sh "git reset --hard origin/latest"
         sh "GIT_SSH_COMMAND='ssh -i $check'  git checkout -b \$(cat version.conf)"
         sh "GIT_SSH_COMMAND='ssh -i $check' git push --set-upstream origin \$(cat version.conf)"
       }
       withCredentials([string(credentialsId: 'gh_token', variable: 'GH_TOKEN')]) {
         sh(script:"""gh release create \$(cat version.conf) --generate-notes""", returnStdout: true)
       }
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
