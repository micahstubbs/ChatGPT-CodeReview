# Plan: Publish Action to GitHub Marketplace

**Issue:** #57 - Publish action to GitHub Marketplace as 'GPT 5.x PR Review Bot'

## Important Limitation

**GitHub CLI cannot publish to the Marketplace directly.** Publishing requires 2FA confirmation through the web UI. This is a security requirement from GitHub.

Sources:
- [GitHub CLI Issue #10045](https://github.com/cli/cli/issues/10045) - Feature request for `--marketplace` flag
- [GitHub CLI Issue #5193](https://github.com/cli/cli/issues/5193) - Earlier request for marketplace publish flag
- [GitHub Community Discussion #7941](https://github.com/orgs/community/discussions/7941) - Confirms this limitation

## Solution

1. **Automate what we can:** Update `action.yml`, create PR, create release via CLI
2. **Manual step:** User must edit the release in web UI to check "Publish to Marketplace"

## Implementation Tasks

### Task 1: Update action.yml

Update the action metadata:
```yaml
name: GPT 5.x PR Review Bot
description: 'A Code Review Action Powered by GPT-5.x Models'
```

### Task 2: Verify Marketplace Requirements

Check that all requirements are met:
- [x] `action.yml` exists in root directory
- [ ] `name` is unique in the marketplace (will verify)
- [x] `description` is provided
- [x] `branding` icon and color are set
- [x] Repository is public
- [x] README.md documents usage

### Task 3: Create PR with Changes

Create a PR with the `action.yml` changes so they can be reviewed before release.

### Task 4: After PR Merges - Create Release

Use `gh release create` to create a release:
```bash
gh release create v2.0.0 --title "GPT 5.x PR Review Bot" --notes "$(cat <<'EOF'
## GPT 5.x PR Review Bot

This release rebrands the action and prepares it for GitHub Marketplace publishing.

### Changes
- Renamed action to "GPT 5.x PR Review Bot"
- Updated description to reflect GPT-5.x model support

### Manual Step Required
To publish to the GitHub Marketplace:
1. Go to the release page
2. Click "Edit release"
3. Check "Publish this Action to the GitHub Marketplace"
4. Save changes

This step requires 2FA and cannot be automated via CLI.
EOF
)"
```

### Task 5: Manual Marketplace Publishing (User Action Required)

The user must:
1. Navigate to the release page
2. Edit the release
3. Check "Publish this Action to the GitHub Marketplace"
4. Complete 2FA verification
5. Save

## Files to Modify

- `action.yml` - Update name and description

## Acceptance Criteria

- [x] `action.yml` updated with new name: `GPT 5.x PR Review Bot`
- [x] Description updated to reference GPT-5.x models
- [x] PR created and merged
- [x] Release created via `gh release create`
- [ ] **Manual:** User publishes to Marketplace via web UI
