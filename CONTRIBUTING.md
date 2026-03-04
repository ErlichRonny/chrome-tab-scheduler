# Contributing to Tab Scheduler

Thank you for your interest in contributing to Tab Scheduler! This document provides guidelines and instructions for contributing to the project.

## Welcome Contributors

We welcome contributions of all kinds:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Tests
- 🌐 Translations (future)

## Getting Started

### Prerequisites

- Google Chrome (version 88+) or any Chromium-based browser
- Basic knowledge of JavaScript, HTML, and CSS
- Familiarity with Chrome Extension APIs (helpful but not required)

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/chrome-tab-scheduler.git
   cd chrome-tab-scheduler
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the extension directory (folder containing `manifest.json`)
   - The extension icon should appear in your toolbar

3. **Make your changes**
   - Edit the code in your favorite editor
   - The extension will reload automatically for most changes
   - For service worker (`background.js`) changes, click the refresh icon on `chrome://extensions`

4. **Test your changes**
   - See [Testing](#testing) section below
   - Ensure no console errors in popup or service worker
   - Test across different scenarios

## Code Style Guidelines

### General Principles

- **No external dependencies**: Keep the extension lightweight and self-contained
- **Follow existing patterns**: Match the coding style of the existing codebase
- **Keep it simple**: Prefer straightforward solutions over complex abstractions
- **Comment complex logic**: Add comments for non-obvious code
- **Use meaningful names**: Variables and functions should be self-descriptive

### JavaScript Style

```javascript
// ✅ Good
function scheduleTab(tabInfo, scheduledTime) {
  const alarmId = `alarm_${scheduledTime}_${generateId()}`;
  // ... implementation
}

// ❌ Avoid
function st(t, s) {
  const a = `alarm_${s}_${gid()}`;
  // ... implementation
}
```

### HTML/CSS Style

- Use semantic HTML elements
- Follow BEM naming convention for CSS classes where applicable
- Keep CSS organized by component
- Use CSS variables for theming (defined in popup.css)

### Chrome Extension Best Practices

- Use Manifest V3 APIs
- Handle errors gracefully with try/catch
- Validate user input
- Use chrome.storage.local for persistence
- Test permission boundaries

## Testing

### Manual Testing Checklist

Before submitting a pull request, test these scenarios:

- [ ] **Schedule a tab**: Works with quick presets and custom time
- [ ] **Custom presets**: Can create, edit, and delete custom presets
- [ ] **View scheduled tabs**: List displays correctly with search
- [ ] **Cancel scheduled tab**: Removes from list and cancels alarm
- [ ] **Edit scheduled tab**: Can modify scheduled time
- [ ] **Tab reopening**: Tabs reopen at correct time in new window
- [ ] **Grouped tabs**: Multiple tabs scheduled within 2 seconds open in one window
- [ ] **Notifications**: Show for schedule and reopen events
- [ ] **Keyboard shortcuts**: All shortcuts work as expected
- [ ] **Settings**: All settings persist and work correctly
- [ ] **Import/Export**: Can export and import scheduled tabs
- [ ] **Browser restart**: Scheduled tabs persist after restart
- [ ] **Missed schedules**: Tabs scheduled while browser closed open on startup
- [ ] **Error handling**: Invalid URLs, system tabs handled gracefully

### Debugging

**Service Worker Logs:**
1. Go to `chrome://extensions`
2. Find "Tab Scheduler"
3. Click "service worker" link
4. Check console for errors

**Popup Logs:**
1. Click extension icon
2. Right-click popup → "Inspect"
3. Check console for errors

**Storage Inspection:**
```javascript
// In service worker console
chrome.storage.local.get(null, (data) => console.log(data));

// Check alarms
chrome.alarms.getAll((alarms) => console.log(alarms));
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Test thoroughly**
   - Complete the manual testing checklist
   - Test edge cases
   - Check for console errors

3. **Update documentation**
   - Update README.md if adding features
   - Update CHANGELOG.md with your changes
   - Add code comments for complex logic

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: description of your changes"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

### Submitting the PR

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template (see `.github/PULL_REQUEST_TEMPLATE.md`)
5. Include:
   - Clear description of changes
   - Screenshots for UI changes
   - Testing steps
   - Related issue numbers

### PR Review Process

- Maintainer will review your PR
- Address any requested changes
- Once approved, your PR will be merged
- Your contribution will be credited in CHANGELOG.md

## Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/ErlichRonny/chrome-tab-scheduler/issues)
2. Verify you're using the latest version
3. Check service worker and popup console logs
4. Try to reproduce the bug

### Bug Report Template

Use the issue template in `.github/ISSUE_TEMPLATE/bug_report.md`:

- **Description**: Clear description of the bug
- **Steps to reproduce**: Numbered list of steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Chrome version, OS, extension version
- **Console logs**: Any error messages
- **Screenshots**: If applicable

## Feature Requests

Use the issue template in `.github/ISSUE_TEMPLATE/feature_request.md`:

- **Problem**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives**: Other solutions you considered
- **Additional context**: Mockups, examples, etc.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks
- Publishing others' private information

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/ErlichRonny/chrome-tab-scheduler/discussions) (if enabled)
- **Bug reports**: Use [GitHub Issues](https://github.com/ErlichRonny/chrome-tab-scheduler/issues)
- **Security concerns**: See [SECURITY.md](SECURITY.md)

## Recognition

Contributors will be:
- Listed in CHANGELOG.md for their contributions
- Credited in release notes
- Added to a CONTRIBUTORS.md file (future)

Thank you for contributing to Tab Scheduler! 🎉
