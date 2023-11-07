def gitBranch = env.BRANCH_NAME
def gitURL = "git@github.com:Memphisdev/memphis.js.git"
def repoUrlPrefix = "memphisos"

node ("small-ec2-fleet") {
  git credentialsId: 'main-github', url: gitURL, branch: gitBranch
  if (env.BRANCH_NAME ==~ /(master)/) { 
    versionTag = readFile "./version-beta.conf"
  }
  else {
    versionTag = readFile "./version.conf"
  }

  try{
  
    stage('Install NPM') {
      sh """
        sudo dnf install https://rpm.nodesource.com/pub_18.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm -y
        sudo dnf install nodejs -y --setopt=nodesource-nodejs.module_hotfixes=1
        sudo dnf install -y /usr/bin/g++
      """
    }

   stage('Push to NPM') {
      if (env.BRANCH_NAME ==~ /(master)/) {
        sh """
          sed -i -r "s/memphis-dev/memphis-dev-beta/g" ./package.json
        """
      }
      sh """
        sed -i -r "s/version\\": \\"[0-9].[0-9].[0-9]/version\\": \\"$versionTag/g" ./package.json
        sudo npm install
      """
      withCredentials([string(credentialsId: 'npm_token', variable: 'npm_token')]) {
       sh "echo //registry.npmjs.org/:_authToken=$npm_token > .npmrc"
       sh 'npm publish'
      }
    }
    
    if (env.BRANCH_NAME ==~ /(latest)/) {
      stage('Checkout to version branch'){
        sh """
          sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo -y
          sudo dnf install gh -y
          sudo dnf install jq -y
        """
        withCredentials([sshUserPrivateKey(keyFileVariable:'check',credentialsId: 'main-github')]) {
          //sh "git reset --hard origin/latest"
          sh """
            GIT_SSH_COMMAND='ssh -i $check'  git checkout -b $versionTag
            GIT_SSH_COMMAND='ssh -i $check' git push --set-upstream origin $versionTag
          """
        }
        withCredentials([string(credentialsId: 'gh_token', variable: 'GH_TOKEN')]) {
          sh """
            gh release create $versionTag --generate-notes
          """
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
