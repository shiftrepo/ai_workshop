# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository (ai_workshop) contains resources for a workshop aimed at promoting AI usage through environment setup and basic operations. It primarily includes documentation on GitHub integration and using Claude Code.

## Environment Setup and Essential Commands

### Basic GitHub Commands

```bash
# Check repository information
git remote -v

# Get issues list from remote repository
gh issue list -R [username]/[repository] --json number,title,state,createdAt

# Check authentication status
gh auth status
```

### Environment Variables

The following environment variables are required for Claude Code and GitHub integration:

```
ANTHROPIC_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0
ANTHROPIC_SMALL_FAST_MODEL=us.anthropic.claude-3.5-haiku-20241022-v1:0
AWS_ACCESS_KEY_ID=[personal AWS access key]
AWS_REGION=us-east-1
AWS_SECRET_ACCESS_KEY=[personal AWS secret key]
CLAUDE_CODE_USE_BEDROCK=1
GH_TOKEN=[personal GitHub access token]
```

## Repository Structure

This repository has the following structure:

```
ai_workshop/
├── doc/                           # Environment setup documentation
│   ├── ClaudeCodeのインストールと設定.md
│   ├── GitHubCLIのインストール.md
│   ├── Githubにリポジトリを作成してClaudeCodeでアクセス.md
│   ├── SSHキー作成と登録.md
│   ├── img/                       # Screenshots and images
│   ├── nodeのインストール.md
│   ├── patの作成.md
│   └── 環境変数の設定.md
├── .gitignore                     # Git tracking exclusions
└── README.md                      # Overview of setup procedures
```

## Important Workflows

1. **Environment Setup Process**: Follow the procedures outlined in README.md (SSH key creation → PAT creation → Environment variables setup → Node.js setup → GitHub CLI setup → Claude Code setup → Repository creation/access).

2. **GitHub Integration**: Use the GH_TOKEN set in environment variables to access repository and issue information via GitHub CLI.

3. **Using Claude Code**: After completing the environment setup, launch with the `claude` command and use GitHub integration features for code and issue management.

## Troubleshooting

* **Environment Variables Issues**: After setting environment variables, open a new command prompt window or restart your PC to apply the changes.
* **GitHub Authentication Errors**: Check the expiration date and permissions of your PAT. Note that the expiration period must be set to less than one year.
* **SSH Key Related Errors**: Verify the registration status of your keys.