# Privacy Policy

**Last Updated: March 7, 2026**

Tab Scheduler doesn't collect any data. Everything stays on your device.

## What's Stored Locally

The extension stores the following in `chrome.storage.local` — it never leaves your browser:

- URLs, titles, and favicons of scheduled tabs
- Scheduled times and recurrence settings
- Custom preset configurations
- Settings (theme, notifications, etc.)

This data is only used to display your scheduled tabs, trigger alarms to reopen them, and persist schedules across browser restarts. You can clear it anytime by uninstalling the extension or via Chrome's "Clear browsing data."

## What's Not Stored

- No browsing history
- No analytics or usage data
- No personal information
- The extension makes no network requests and has no external servers

## Permissions

| Permission | Why |
|------------|-----|
| `tabs` | Read the URL, title, and favicon of the tab you're scheduling |
| `alarms` | Schedule when tabs should reopen |
| `storage` | Save your schedules so they persist after browser restart |
| `notifications` | Show desktop alerts when a tab is scheduled or reopens |
| `tabGroups` | Group multiple tabs that reopen at the same time into one window |
| `contextMenus` | Add a right-click menu option to schedule a tab |

None of these permissions are used to access tab content, passwords, form data, or any other website data.
