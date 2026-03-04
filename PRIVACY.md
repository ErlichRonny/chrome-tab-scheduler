# Privacy Policy

**Last Updated: March 3, 2026**

## Overview

Tab Scheduler is committed to protecting your privacy. This privacy policy explains how the extension handles your data.

## TL;DR

**We collect ZERO data. Everything stays on your device.**

## Data Collection

### What We Collect

**Nothing.** Tab Scheduler collects:
- ❌ No personal information
- ❌ No browsing history
- ❌ No analytics or telemetry
- ❌ No usage statistics
- ❌ No tracking data

### What We Store Locally

The extension stores data **locally in your browser only** using Chrome's storage API:

**Scheduled Tabs Data:**
- URLs of scheduled tabs
- Page titles
- Favicon URLs
- Scheduled times
- Custom preset configurations
- User settings (theme, notifications, etc.)

**Where it's stored:**
- `chrome.storage.local` (local browser storage)
- Never leaves your device
- Not synced to cloud (unless you enable Chrome Sync for extensions)
- You can clear it anytime via extension settings or Chrome's "Clear browsing data"

## Data Usage

Your scheduled tab data is used **only** for:
- Displaying your scheduled tabs in the extension popup
- Creating alarms to reopen tabs at scheduled times
- Persisting your schedules across browser restarts
- Importing/exporting your scheduled tabs (when you explicitly choose to)

## Data Sharing

**We share NOTHING because we collect NOTHING.**

- ❌ No third-party services
- ❌ No external servers
- ❌ No analytics providers
- ❌ No advertising networks
- ❌ No data brokers

The extension **never communicates with external servers**. All functionality is 100% local.

## Permissions Explained

The extension requests these Chrome permissions:

### `tabs`
**Why:** To access tab information (URL, title, favicon) when you schedule a tab
**What it accesses:** Only the tab you're actively scheduling
**What it doesn't do:** Does not read tab content, passwords, or form data

### `alarms`
**Why:** To schedule when tabs should reopen
**What it accesses:** Chrome's alarm API to schedule events
**What it doesn't do:** Does not create browser alarms outside this extension

### `storage`
**Why:** To save your scheduled tabs so they persist after browser restart
**What it accesses:** Chrome's local storage API
**What it doesn't do:** Does not access cookies, passwords, or other extension's data

### `notifications`
**Why:** To show desktop notifications when tabs are scheduled/reopened
**What it accesses:** Chrome's notification API
**What it doesn't do:** Does not send notifications to external services

### `host_permissions` (none requested)
**Note:** This extension does NOT request permission to access any websites' content

## User Control

### You Control Your Data

**View your data:**
```javascript
// Open service worker console (chrome://extensions → service worker)
chrome.storage.local.get(null, (data) => console.log(data));
```

**Delete your data:**
1. Open extension popup → Settings → "Clear All Data"
2. Or uninstall the extension
3. Or use Chrome's "Clear browsing data" → "Hosted app data"

**Export your data:**
- Use Settings → Import/Export → Export Scheduled Tabs
- Saves a JSON file you can inspect

**Import your data:**
- Use Settings → Import/Export → Import Scheduled Tabs
- Restore from previously exported JSON file

## Chrome Web Store

If/when this extension is published to the Chrome Web Store:
- Google may collect aggregate installation statistics (we don't see individual data)
- You can see Google's privacy policy at https://policies.google.com/privacy

## Open Source Transparency

This extension is **fully open source**:
- Source code: https://github.com/ErlichRonny/chrome-tab-scheduler
- You can audit the entire codebase
- You can verify no data is sent externally
- You can build it yourself from source

## Children's Privacy

This extension does not knowingly collect data from anyone, including children under 13. Since we collect no data at all, there are no special considerations.

## Changes to Privacy Policy

If we ever change this privacy policy:
- We'll update the "Last Updated" date
- We'll notify users via extension update notes
- Major changes will be highlighted in CHANGELOG.md

## Data Breach Notification

Since no data is collected or transmitted:
- There is no server to breach
- There is no database to compromise
- Your data stays on your device under your control

## Contact

For privacy questions or concerns:
- Open an issue: https://github.com/ErlichRonny/chrome-tab-scheduler/issues
- Email: [Add your email if you want to provide one]

## Legal Compliance

This extension complies with:
- **GDPR** (EU): No personal data collected
- **CCPA** (California): No personal data sold (or collected)
- **Chrome Web Store Policies**: Minimal permissions, clear privacy policy

## Your Rights

Since we don't collect your data, you automatically have:
- ✅ Right to access: All data is on your device
- ✅ Right to deletion: Clear data anytime
- ✅ Right to portability: Export/import your data
- ✅ Right to object: Don't use the extension if you object
- ✅ Right to be forgotten: Uninstall removes everything

## Summary

**Tab Scheduler is privacy-first by design:**
1. Zero data collection
2. Everything stored locally
3. No external communication
4. Open source and auditable
5. You control your data completely

If you have any questions about this privacy policy or the extension's data practices, please open an issue on GitHub.
