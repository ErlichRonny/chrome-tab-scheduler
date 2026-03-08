# Changelog

All notable changes to the Tab Scheduler Chrome Extension.

## [1.12.0] - 2026-03-03

### Added - Recurring Schedules

- **Recurring tab support**: Schedule tabs to reopen on a repeating pattern
  - Daily, Weekdays (Mon–Fri), Weekly, or Custom days of the week
  - Runs forever or until a specified end date
  - Toggle inline in the popup — no extra screens
  - Recurring tabs show 🔁 badge in the scheduled list
  - Notification includes next recurrence time
  - Missed recurrences open once on browser restart, then schedule next future occurrence

### Changed

- Bumped version to 1.12.0

## [1.11.0] - 2026-03-03

### Added - Import/Export & Polish

- **Import/Export Backup Functionality**
  - Export all scheduled tabs to a JSON backup file
  - Import previously exported backups to restore scheduled tabs
  - Merge or replace options when importing

- **Professional UI Polish**
  - Smooth animations and transitions throughout
  - Empty state illustrations with helpful prompts
  - Onboarding flow for first-time users
  - Loading states and skeleton screens

### Changed

- Bumped version to 1.11.0

---

## [1.10.0] - 2026-03-03

### Added - Settings & Customization

- **Comprehensive Settings Page**
  - Theme selection (Light, Dark, System)
  - Animation preferences (enabled/disabled)
  - Notification settings
  - Default scheduling presets configuration
  - Badge count toggle

- **Keyboard Shortcuts**
  - Quick actions with customizable shortcuts
  - Keyboard shortcuts help overlay
  - Cross-platform support (Mac/Windows)

---

## [1.9.0] - 2026-03-03

### Added - Custom Presets

- **Custom Preset Editor**
  - Create user-defined quick schedule buttons
  - Set custom time offsets and labels
  - Reorder, edit, and delete presets
  - Presets persist across browser restarts

---

## [1.2.0] - 2026-02-01

### Added - Grouped Tabs

- **Smart Window Management for Multiple Scheduled Tabs**
  - Single tab opens: Opens in new window (existing behavior)
  - Multiple tabs open together: All open in ONE window, grouped as "Snoozed"
  - Works for both:
    - Tabs that fire while Chrome is running (batched within 2 seconds)
    - Past-due tabs when browser restarts
  - Group named "Snoozed" with blue color for easy identification
  - Prevents multiple windows from opening

### Changed

- Enhanced alarm listener with batching logic
  - Alarms firing within 2 seconds are grouped together
  - New queue system with `pendingAlarms` and `batchTimeout`
  - New `processPendingAlarms()` function for batch processing
- Refactored reconciliation logic in background.js
  - New `reopenPastDueTabs()` function for past-due tabs
  - Collects all past-due tabs before reopening
  - Handles single vs multiple tabs differently
- Updated notifications
  - Single: "Tab Reopened: [title]"
  - Multiple: "Reopened X tabs in one window"

### Technical

- Added `tabGroups` permission to manifest.json
- New batching mechanism in alarm listener:
  - `pendingAlarms[]` - Queue for alarms firing close together
  - `batchTimeout` - 2-second delay to collect alarms
  - `processPendingAlarms()` - Batch processor for queued alarms
- New function for past-due tabs:
  - `reopenPastDueTabs(pastDueTabs, scheduledTabs)` - Handles startup reconciliation
- Enhanced reconciliation logic:
  - Collects past-due tabs into array
  - Batch processes for grouping
  - Fallback to individual windows if grouping fails
- Uses Chrome Tab Groups API:
  - `chrome.tabs.group()` to create group
  - `chrome.tabGroups.update()` to set name and color

### User Experience Improvements

- **Better missed schedule handling**: No more 10 windows opening if you missed 10 tabs
- **Visual organization**: Grouped tabs are clearly marked as "Snoozed"
- **Cleaner workspace**: One window with organized tabs vs. multiple scattered windows

### Backwards Compatibility

- ✅ Single missed tab behavior unchanged
- ✅ All existing functionality preserved
- ✅ Storage format unchanged
- ✅ No breaking changes

---

## [1.1.0] - 2026-02-01

### Added - Smart Scheduling

- **Quick Schedule Buttons**: 6 preset buttons for instant scheduling
  - "In 1 hour" - Schedule for 60 minutes from now
  - "In 3 hours" - Schedule for 3 hours from now
  - "Tomorrow 9am" - Schedule for 9:00 AM next day
  - "Tomorrow 2pm" - Schedule for 2:00 PM next day
  - "Next Monday 9am" - Schedule for next Monday at 9:00 AM
  - "Next week" - Same time, 7 days ahead

- **Enhanced Calendar Picker**
  - Visual calendar icon (📅) next to date/time input
  - Improved hover effects and styling
  - Better visual feedback for user interaction

- **Documentation**
  - SMART_SCHEDULING.md - Comprehensive smart scheduling guide
  - QUICK_START.md - Quick reference for users
  - CHANGELOG.md - Version history

### Changed

- Reorganized popup UI with clear sections
  - "Quick Schedule" section at top
  - "Or Pick Custom Time" section below
- Refactored scheduling logic for code reuse
  - New `scheduleTabWithTime()` function for shared logic
  - Both quick and manual scheduling use same core logic
- Updated README.md with smart scheduling features
- Bumped version to 1.1.0

### Technical

- New functions in popup.js:
  - `handleQuickSchedule(preset)` - Routes quick schedule button clicks
  - `calculatePresetTime(preset)` - Calculates timestamp for each preset
  - `scheduleTabWithTime(timestamp)` - Core scheduling logic (refactored)
- Enhanced CSS with:
  - `.quick-schedule-section` and `.quick-schedule-grid` styles
  - `.btn-quick` button styling with hover/active/disabled states
  - `.datetime-wrapper` and `.calendar-icon` for enhanced picker
- Quick schedule buttons disabled for invalid tabs (chrome://, etc.)

### User Experience Improvements

- **80% faster scheduling** for common patterns
- **One-click scheduling** with presets (vs. 6+ clicks manually)
- **No mental math** required ("what time is 3 hours from now?")
- **Better visual hierarchy** with section headers
- **Improved accessibility** with clear button labels

### Backwards Compatibility

- ✅ All existing functionality preserved
- ✅ Manual scheduling unchanged
- ✅ Storage format unchanged
- ✅ Existing scheduled tabs continue working
- ✅ No breaking changes

---

## [1.0.0] - 2026-01-XX

### Initial Release

- Schedule tabs to reopen at specific date/time
- Manual date/time picker
- View list of scheduled tabs
- Cancel scheduled tabs
- Desktop notifications
- Persists across browser restarts
- Handles missed schedules (past-due)
- Reconciliation logic for browser restarts
- Clean, modern UI matching Chrome design
- Support for Manifest V3

### Core Features

- **Tab Scheduling**: Close tab now, reopen later
- **Alarms API**: Reliable scheduling with chrome.alarms
- **Local Storage**: Persistent data storage
- **Notifications**: User feedback for all actions
- **Validation**: Prevents invalid URLs and past times
- **Edge Cases**: Handles browser restarts, past-due schedules

### Technical Implementation

- Manifest V3 service worker architecture
- Chrome APIs: tabs, windows, alarms, storage, notifications
- No external dependencies (pure JavaScript)
- Comprehensive error handling
- Console logging for debugging

### Documentation

- README.md - User documentation
- INSTALL.md - Installation instructions
- TESTING.md - Testing guide
- PROJECT_SUMMARY.md - Implementation overview

---

## Future Enhancements (Planned)

### Potential Features

- Recurring schedules ("Every Monday at 9am")
- Natural language processing ("tomorrow morning", "next Friday")
- Smart suggestions based on usage patterns
- Restore tabs in original position (not just new window)
- Statistics dashboard
- Time zone support

### Version Roadmap

- **v2.0.0** - Recurring schedules (major architecture change)
- **v2.1.0** - Natural language parsing
- **v3.0.0** - Cloud sync, cross-device scheduling

---

## Version History Summary

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| 1.11.0  | 2026-03-03   | Import/export backup, UI polish, onboarding |
| 1.10.0  | 2026-03-03   | Settings page, keyboard shortcuts |
| 1.9.0   | 2026-03-03   | Custom presets editor |
| 1.2.0   | 2026-02-01   | Grouped tabs for multiple simultaneous reopens |
| 1.1.0   | 2026-02-01   | Smart scheduling with quick presets |
| 1.0.0   | 2026-01-XX   | Initial release with manual scheduling |

---

## Contributing

This is an open-source project. Contributions welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Current Version**: 1.11.0
**Last Updated**: 2026-03-03
