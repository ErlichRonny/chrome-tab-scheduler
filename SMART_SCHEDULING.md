# Smart Scheduling Feature

## Overview

The Tab Scheduler extension now includes **Smart Scheduling** with quick action buttons for common scheduling times, plus an enhanced calendar picker interface.

## What's New

### 1. Quick Schedule Buttons

Six convenient preset buttons for instant scheduling:

| Button | Action |
|--------|--------|
| **In 1 hour** | Schedules tab to reopen 1 hour from now |
| **In 3 hours** | Schedules tab to reopen 3 hours from now |
| **Tomorrow 9am** | Schedules tab for 9:00 AM next day |
| **Tomorrow 2pm** | Schedules tab for 2:00 PM next day |
| **Next Monday 9am** | Schedules tab for 9:00 AM on next Monday |
| **Next week** | Schedules tab for same time, 7 days from now |

### 2. Enhanced Date/Time Picker

- Visual calendar icon (📅) next to the input field
- Native browser calendar picker (click the input or icon)
- Hover effects for better UX
- Maintains all previous validation

## How to Use

### Quick Scheduling (One-Click)

1. Navigate to any webpage you want to schedule
2. Click the Tab Scheduler icon
3. Click any of the Quick Schedule buttons (e.g., "Tomorrow 9am")
4. Tab closes immediately and is scheduled
5. Done! No need to pick dates manually

**Example**: Click "In 1 hour" → Tab closes → Reopens in exactly 1 hour

### Manual Scheduling (Custom Times)

1. Click the Tab Scheduler icon
2. Scroll down to "Or Pick Custom Time"
3. Click the date/time input field
4. Browser's native calendar picker opens
5. Select your desired date and time
6. Click "Schedule & Close Tab"

## Smart Scheduling Logic

### Relative Times

- **In 1 hour**: Adds 60 minutes to current time
- **In 3 hours**: Adds 180 minutes to current time

### Next Day Times

- **Tomorrow 9am**: Sets time to 9:00 AM the next calendar day
- **Tomorrow 2pm**: Sets time to 2:00 PM (14:00) the next calendar day

### Next Week Times

- **Next Monday 9am**: Calculates days until next Monday, sets time to 9:00 AM
  - If today is Monday, schedules for next Monday (7 days away)
  - If today is Sunday, schedules for tomorrow (Monday)
  - Works correctly across all days of the week

- **Next week**: Adds exactly 7 days to current date/time
  - Keeps the same hour and minute
  - Example: If it's Tuesday 3:45 PM, schedules for next Tuesday 3:45 PM

## UI Changes

### Quick Schedule Section

```
┌─────────────────────────────────────┐
│        Quick Schedule               │
│  ┌────────────┐  ┌────────────┐    │
│  │ In 1 hour  │  │ In 3 hours │    │
│  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐    │
│  │Tomorrow 9am│  │Tomorrow 2pm│    │
│  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐    │
│  │Next Mon 9am│  │ Next week  │    │
│  └────────────┘  └────────────┘    │
└─────────────────────────────────────┘
```

### Manual Schedule Section

```
┌─────────────────────────────────────┐
│      Or Pick Custom Time            │
│  Date and time:                     │
│  ┌──────────────────────────────┐  │
│  │ [calendar picker input]   📅 │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Schedule & Close Tab        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Visual Design

### Quick Schedule Buttons

- **Layout**: 2-column grid for easy scanning
- **Style**: Blue text on white background with borders
- **Hover**: Blue background tint, lifted shadow
- **Active**: Darker blue, slight scale down
- **Disabled**: Grayed out (for system tabs)

### Calendar Picker

- **Icon**: 📅 emoji positioned on the right
- **Input**: Native datetime-local with browser's calendar
- **Hover**: Border color change for feedback
- **Focus**: Blue outline matching Chrome's style

## Validation & Error Handling

All quick schedule buttons validate:

- ✅ Tab must be a valid web page (not chrome://, about:, etc.)
- ✅ Calculated time must be in the future
- ✅ Current tab must be available

Error messages show if:
- System tabs can't be scheduled (buttons disabled)
- Scheduling fails for any reason

## Code Changes

### Files Modified

1. **popup/popup.html**
   - Added quick schedule section with 6 preset buttons
   - Added calendar icon to datetime input
   - Added section headers for better organization

2. **popup/popup.css**
   - New `.quick-schedule-section` styling
   - New `.quick-schedule-grid` (2-column layout)
   - New `.btn-quick` button styles (hover, active, disabled)
   - New `.datetime-wrapper` for calendar icon positioning
   - Enhanced `.datetime-input` with icon space

3. **popup/popup.js**
   - New `handleQuickSchedule(preset)` - Routes quick schedules
   - New `calculatePresetTime(preset)` - Calculates timestamp for each preset
   - New `scheduleTabWithTime(timestamp)` - Core scheduling logic (shared)
   - Refactored `scheduleTab()` - Now uses shared logic
   - Updated `setupEventListeners()` - Adds quick button listeners
   - Updated `loadCurrentTab()` - Disables quick buttons for invalid tabs

### No Breaking Changes

- All existing functionality preserved
- Manual scheduling works exactly as before
- Scheduled tabs list unchanged
- Notifications unchanged
- Storage format unchanged

## Browser Calendar Picker

The native `<input type="datetime-local">` provides a built-in calendar picker in all modern browsers:

### Chrome/Edge
- Click input → Calendar overlay opens
- Select date, then time with spinners
- Visual, easy-to-use interface

### Firefox
- Click input → Date/time picker opens
- Separate date and time selection
- Clean, accessible interface

### Safari
- Click input → Calendar picker
- iOS-style date/time wheels
- Touch-friendly on iPad

## Benefits

### For Users

1. **Faster Scheduling**: One click vs. multiple clicks/typing
2. **Common Patterns**: Covers 80% of use cases
3. **No Thinking**: Don't need to calculate "what time is 3 hours from now?"
4. **Still Flexible**: Custom time picker for specific needs
5. **Better UX**: Visual calendar instead of typing dates

### For Power Users

- Quick scheduling for routine tasks
- Custom scheduling still available
- Both methods work equally well
- Can mix and match as needed

## Examples

### Morning Reading Routine

You're browsing at 11 PM and find an article:
- Click "Tomorrow 9am"
- Article reopens when you start your morning coffee ☕

### Meeting Prep

Meeting at 2 PM, want to review docs beforehand:
- Click "Tomorrow 2pm"
- Docs reopen right when you need them 📄

### Weekly Review

Want to review this page same time next week:
- Click "Next week"
- Page reopens at the same time, 7 days later 📊

### Short Break

Need a break, want this tab back soon:
- Click "In 1 hour"
- Tab reopens after your break ⏰

## Testing

### Test Quick Schedule Buttons

1. Open any webpage (e.g., google.com)
2. Click Tab Scheduler icon
3. Click "In 1 hour"
4. Verify:
   - Tab closes immediately ✓
   - Notification: "Tab Scheduled" ✓
   - Wait 1 hour...
   - Tab reopens in new window ✓

### Test All Presets

Test each button with different days/times:

| Button | Test Case |
|--------|-----------|
| In 1 hour | Any time, verify +1 hour |
| In 3 hours | Any time, verify +3 hours |
| Tomorrow 9am | Test at various times of day |
| Tomorrow 2pm | Test before/after 2pm |
| Next Monday 9am | Test on different days of week |
| Next week | Test on different days, verify same time |

### Test Calendar Picker

1. Click the date/time input field
2. Browser's calendar picker opens
3. Select a date and time
4. Verify input shows selected value
5. Click "Schedule & Close Tab"
6. Verify tab schedules correctly

### Test Disabled State

1. Open `chrome://extensions`
2. Click Tab Scheduler icon
3. Verify:
   - Error message shows ✓
   - Quick buttons are disabled (grayed out) ✓
   - Manual schedule button disabled ✓

## Future Enhancements

Potential additions for future versions:

- **More Presets**: "In 30 minutes", "Tonight at 8pm", "End of week"
- **Custom Presets**: Let users define their own quick buttons
- **Smart Suggestions**: Learn user's patterns, suggest common times
- **Recurring**: "Every Monday at 9am" (would need new architecture)
- **Time Zones**: Handle scheduling across time zones
- **Relative Days**: "In 2 days", "In 1 week", "In 1 month"

## Backwards Compatibility

✅ All existing scheduled tabs continue to work
✅ No changes to storage format
✅ No changes to alarm handling
✅ Extension can be updated without losing data
✅ Old manual scheduling method unchanged

## Summary

Smart Scheduling makes the Tab Scheduler extension much more convenient by:

1. **Adding 6 quick preset buttons** for common scheduling times
2. **Enhancing the calendar picker** with visual icon and better styling
3. **Maintaining full backwards compatibility** with existing features
4. **Keeping both options**: Quick schedule OR custom time
5. **Improving overall UX** without adding complexity

The extension is now more user-friendly while remaining just as powerful and flexible!
