const git_token = process.env.DOCS_ACTION_TOKEN

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
    auth: git_token
  })

const repos = [
  {
    repo_name: 'memphis.js',
    doc_path: 'docs/sdk/client-libraries/node/quick-start.md',
    language_name: 'JavaScript'
  }
]

let did_error = false;
const failed_languages = [];
for (let repo of repos){
  try {
    await update_file(repo.repo_name, repo.doc_path, repo.language_name)
  } catch (error) {
    console.log();(error);
    did_error = true;
    failed_languages.push(repo.language_name)
  }
}

if (did_error){
  throw new Error(`Failed to update one or more languages. \n Failed Languages: ${failed_languages.join(', ')}`)
}

async function update_file(repo_name, doc_path, language_name){
  console.log(`Updating ${language_name} Quickstart`);
  console.log(`Repo: ${repo_name}`);

  console.log(`Getting ${language_name} README`);
  let req = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: 'memphisdev',
    repo: repo_name,
    path: 'README.md',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
})

  console.log(`Getting ${language_name} Quickstart SHA`);
  let quick_start = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: 'memphisdev',
      repo: 'documentation',
      path: doc_path,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
  })

  const quick_start_sha = quick_start.data.sha;

  console.log(`Quickstart SHA: ${quick_start_sha}`);

  const readme_content = atob(req.data.content)
  const readme_h3_to_h2 = readme_content.replace(/###/g, '##')
  const commit_string = `---
  title: ${language_name} Quickstart
  description: A quickstart on how to use the ${language_name} client library
---`+ '\n' + readme_h3_to_h2 

  console.log(`Updating ${language_name} Quickstart`);
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: 'memphisdev',
      repo: 'documentation',
      path: doc_path,
      message: `Updating ${language_name} SDK Quick-Start`,
      committer: {
        name: 'Automated Workflow',
        email: 'john@memphis.dev'
      },
      content: btoa(commit_string),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
      sha: quick_start_sha
  })
}

