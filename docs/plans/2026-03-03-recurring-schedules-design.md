# Recurring Schedules Design

**Date:** 2026-03-03
**Status:** Approved

## Overview

Add recurring schedule support to Tab Scheduler. A recurring tab reopens on a repeating pattern and automatically reschedules itself for the next occurrence after each firing.

## Decisions

| Question | Decision |
|----------|----------|
| Recurrence patterns | Daily, Weekdays (Mon–Fri), Weekly, Custom days |
| End conditions | Never (until cancelled), or on a specific end date |
| UI placement | Repeat toggle inline in popup, expands below scheduling buttons |
| List behavior | Single entry showing next occurrence, updates after each firing |
| After firing | Tab stays open; next occurrence silently scheduled in background |
| Missed recurrences | Open once, schedule next future occurrence (no spam) |

## Data Structure

Adds an optional `recurrence` field to existing `scheduledTabs` entries. Non-recurring tabs are unaffected.

```json
{
  "alarm_1738453200000_abc123": {
    "alarmId": "alarm_1738453200000_abc123",
    "scheduledTime": 1738453200000,
    "tabInfo": {
      "url": "https://example.com",
      "title": "Example Page",
      "favIconUrl": "https://example.com/favicon.ico"
    },
    "createdAt": 1738366800000,
    "recurrence": {
      "pattern": "custom",
      "days": [1, 3, 5],
      "time": "09:00",
      "endDate": 1746000000000
    }
  }
}
```

**Fields:**
- `pattern`: `"daily"` | `"weekdays"` | `"weekly"` | `"custom"`
- `days`: array of weekday integers (0=Sun, 1=Mon, …, 6=Sat). Used for `"custom"` pattern; for `"weekly"` contains the single day of week derived from the initial scheduled date.
- `time`: time of day in `"HH:MM"` 24h format
- `endDate`: optional Unix timestamp. If the next calculated occurrence exceeds this, the entry is deleted instead of rescheduled.

## UI Design

A **Repeat toggle** appears between the date/time picker and the "Schedule & Close Tab" button. When enabled, a panel expands inline:

```
┌─────────────────────────────────────┐
│  Or Pick Custom Time                │
│  [date/time picker]          📅     │
│                                     │
│  🔁 Repeat  ○ Off  ● On            │
│  ┌───────────────────────────────┐  │
│  │ Pattern: [Daily        ▼]     │  │
│  │                               │  │
│  │ ○ Daily                       │  │
│  │ ○ Weekdays (Mon–Fri)          │  │
│  │ ○ Weekly                      │  │
│  │ ● Custom days:                │  │
│  │   [M] [T] [W] [T] [F] [S] [S]│  │
│  │                               │  │
│  │ Ends: ○ Never                 │  │
│  │       ● On date: [____/___]   │  │
│  └───────────────────────────────┘  │
│                                     │
│  [  Schedule & Close Tab  ]         │
└─────────────────────────────────────┘
```

In the scheduled tabs list, recurring entries display a 🔁 icon and show the next occurrence time. Cancel removes all future recurrences (same flow as one-time tabs).

## Background Logic

### When a recurring alarm fires (`processPendingAlarms`)

1. Open the tab in a new window (same as non-recurring)
2. Show notification: `"[Title] — repeats again [next time]"`
3. Calculate the next occurrence from recurrence rules
4. If `endDate` is set and next occurrence > `endDate` → delete entry, stop
5. Otherwise → generate new `alarmId`, update storage entry with new `alarmId` and `scheduledTime`, create new alarm, remove old alarm key

### Calculating next occurrence

| Pattern | Logic |
|---------|-------|
| `daily` | Add 1 day, keep same time |
| `weekdays` | Advance to next Mon–Fri at same time |
| `weekly` | Add 7 days, keep same time |
| `custom` | Find next day-of-week in `days` array from today, keep same time |

### Missed recurrences (browser was closed)

In `reconcileAlarmsAndStorage`: if a recurring tab is past-due, open it once and calculate the next *future* occurrence to reschedule. Do not replay every missed occurrence.

## Files Changed

| File | Changes |
|------|---------|
| `popup/popup.html` | Add repeat toggle + collapsible recurrence panel HTML |
| `popup/popup.css` | Styles for toggle, day-of-week pill buttons, end date row |
| `popup/popup.js` | Collect recurrence fields and include in `scheduleTab` message; render 🔁 badge in scheduled list for recurring tabs |
| `background.js` | Update `processPendingAlarms` and `reopenPastDueTabs` to detect `recurrence` field and reschedule next occurrence |

No changes to `settings.js`, `settings.html`, `manifest.json`, or existing storage keys.
