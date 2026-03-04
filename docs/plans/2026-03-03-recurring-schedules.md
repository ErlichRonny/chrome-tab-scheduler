# Recurring Schedules Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add recurring schedule support so tabs can reopen daily, on weekdays, weekly, or on custom days, repeating forever or until an end date.

**Architecture:** Add an optional `recurrence` field to existing `scheduledTabs` storage entries. When an alarm fires in `background.js`, if the entry has a `recurrence` field, calculate the next occurrence and reschedule instead of deleting. The popup gets a "Repeat" toggle that expands an inline panel. No new storage keys, no new message types.

**Tech Stack:** Vanilla JavaScript, Chrome Extension APIs (alarms, storage), existing CSS variable system in `popup.css`.

**Design doc:** `docs/plans/2026-03-03-recurring-schedules-design.md`

---

## Task 1: Add recurrence panel HTML to popup

**Files:**
- Modify: `popup/popup.html`

### Step 1: Add the repeat toggle and panel after the datetime-wrapper div

Find this block in `popup/popup.html` (around line 86–93):
```html
      <div id="errorMessage" class="error-message"></div>

      <button id="scheduleButton" class="btn btn-primary">
        Schedule & Close Tab
      </button>
```

Insert the following **between** the `errorMessage` div and the `scheduleButton`:

```html
      <!-- Repeat Toggle -->
      <div class="recurrence-toggle-row">
        <span class="recurrence-toggle-label">🔁 Repeat</span>
        <label class="toggle-switch">
          <input type="checkbox" id="recurrenceToggle">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <!-- Recurrence Panel (hidden until toggle is on) -->
      <div class="recurrence-panel" id="recurrencePanel" style="display: none;">
        <div class="recurrence-pattern-row">
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrencePattern" value="daily" checked> Daily
          </label>
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrencePattern" value="weekdays"> Weekdays
          </label>
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrencePattern" value="weekly"> Weekly
          </label>
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrencePattern" value="custom"> Custom
          </label>
        </div>

        <!-- Custom day picker (shown only when "Custom" is selected) -->
        <div class="recurrence-days-row" id="recurrenceDaysRow" style="display: none;">
          <button type="button" class="day-pill" data-day="1">M</button>
          <button type="button" class="day-pill" data-day="2">T</button>
          <button type="button" class="day-pill" data-day="3">W</button>
          <button type="button" class="day-pill" data-day="4">T</button>
          <button type="button" class="day-pill" data-day="5">F</button>
          <button type="button" class="day-pill" data-day="6">S</button>
          <button type="button" class="day-pill" data-day="0">S</button>
        </div>

        <!-- End date row -->
        <div class="recurrence-end-row">
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrenceEnd" value="never" checked> Never
          </label>
          <label class="recurrence-radio-label">
            <input type="radio" name="recurrenceEnd" value="date"> End on
          </label>
          <input type="date" id="recurrenceEndDate" class="recurrence-end-date" style="display: none;">
        </div>
      </div>
```

### Step 2: Reload the extension and verify

1. Go to `chrome://extensions` → click the reload icon on Tab Scheduler
2. Open the popup on any webpage
3. Scroll to the custom time section — you should see the 🔁 Repeat toggle row above the Schedule button
4. The recurrence panel should not be visible yet (it's hidden)

### Step 3: Commit

```bash
git add popup/popup.html
git commit -m "feat: add recurring schedule panel HTML"
```

---

## Task 2: Style the recurrence panel

**Files:**
- Modify: `popup/popup.css`

### Step 1: Add these styles at the end of `popup/popup.css`

```css
/* ============================================================
   Recurrence Panel
   ============================================================ */

.recurrence-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0 4px;
}

.recurrence-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--border-medium);
  border-radius: 20px;
  transition: background-color 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

/* Recurrence panel container */
.recurrence-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Pattern radio buttons */
.recurrence-pattern-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.recurrence-radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}

.recurrence-radio-label input[type="radio"] {
  accent-color: var(--primary-color);
  cursor: pointer;
}

/* Day-of-week pill buttons */
.recurrence-days-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.day-pill {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-medium);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.day-pill:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.day-pill.selected {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* End date row */
.recurrence-end-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.recurrence-end-date {
  font-size: 12px;
  border: 1px solid var(--border-medium);
  border-radius: 4px;
  padding: 2px 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  height: 24px;
}

/* Recurring badge in scheduled list */
.recurrence-badge {
  font-size: 10px;
  color: var(--primary-color);
  margin-left: 4px;
}
```

### Step 2: Reload and verify

1. Reload the extension
2. Open the popup, scroll to the repeat toggle
3. The toggle should look like a pill toggle (grey when off)
4. Click the toggle — the recurrence panel should slide/appear with radio buttons and an end section

### Step 3: Commit

```bash
git add popup/popup.css
git commit -m "feat: style recurring schedule panel"
```

---

## Task 3: Wire up recurrence panel interactivity in popup.js

**Files:**
- Modify: `popup/popup.js`

### Step 1: Add recurrence setup to `setupEventListeners()`

Find `setupEventListeners()` in `popup.js`. Add this call at the end of the function body:

```javascript
  setupRecurrenceListeners();
```

### Step 2: Add the `setupRecurrenceListeners` function

Add this new function near the bottom of `popup.js`, before the closing of the file:

```javascript
// ============================================================
// Recurrence Panel Logic
// ============================================================

function setupRecurrenceListeners() {
  const toggle = document.getElementById('recurrenceToggle');
  const panel = document.getElementById('recurrencePanel');
  const daysRow = document.getElementById('recurrenceDaysRow');
  const endDateInput = document.getElementById('recurrenceEndDate');

  // Show/hide panel when toggle changes
  toggle.addEventListener('change', () => {
    panel.style.display = toggle.checked ? 'flex' : 'none';
  });

  // Show/hide custom days row based on pattern selection
  document.querySelectorAll('input[name="recurrencePattern"]').forEach(radio => {
    radio.addEventListener('change', () => {
      daysRow.style.display = radio.value === 'custom' ? 'flex' : 'none';
    });
  });

  // Toggle day pill selection
  document.querySelectorAll('.day-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('selected');
    });
  });

  // Show/hide end date input based on end selection
  document.querySelectorAll('input[name="recurrenceEnd"]').forEach(radio => {
    radio.addEventListener('change', () => {
      endDateInput.style.display = radio.value === 'date' ? 'inline-block' : 'none';
    });
  });
}
```

### Step 3: Add the `getRecurrenceData` helper function

Add this function directly below `setupRecurrenceListeners`:

```javascript
// Read recurrence fields from panel; returns null if toggle is off
function getRecurrenceData(scheduledTime) {
  const toggle = document.getElementById('recurrenceToggle');
  if (!toggle.checked) return null;

  const pattern = document.querySelector('input[name="recurrencePattern"]:checked').value;

  // Collect selected days for custom pattern
  let days = [];
  if (pattern === 'custom') {
    document.querySelectorAll('.day-pill.selected').forEach(pill => {
      days.push(parseInt(pill.dataset.day));
    });
    if (days.length === 0) {
      // Default to the day of the scheduled date if nothing selected
      days = [new Date(scheduledTime).getDay()];
    }
  } else if (pattern === 'weekly') {
    // For weekly, store the day of week derived from the scheduled date
    days = [new Date(scheduledTime).getDay()];
  }

  // End date
  const endRadio = document.querySelector('input[name="recurrenceEnd"]:checked').value;
  let endDate = null;
  if (endRadio === 'date') {
    const dateVal = document.getElementById('recurrenceEndDate').value;
    if (dateVal) {
      endDate = new Date(dateVal + 'T23:59:59').getTime();
    }
  }

  // Extract time as HH:MM from the scheduled timestamp
  const d = new Date(scheduledTime);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return { pattern, days, time, endDate };
}
```

### Step 4: Pass recurrence data in the scheduleTab message

Find the `tabData` object construction in the `scheduleTabWithTime` function (around line 372). It looks like:

```javascript
    const tabData = {
      alarmId: alarmId,
      scheduledTime: scheduledTime,
      tabInfo: {
        url: currentTab.url,
        title: currentTab.title || 'Untitled',
        favIconUrl: currentTab.favIconUrl || 'icons/icon48.png'
      },
      createdAt: now
    };
```

Add the recurrence field after `createdAt`:

```javascript
    const recurrence = getRecurrenceData(scheduledTime);
    const tabData = {
      alarmId: alarmId,
      scheduledTime: scheduledTime,
      tabInfo: {
        url: currentTab.url,
        title: currentTab.title || 'Untitled',
        favIconUrl: currentTab.favIconUrl || 'icons/icon48.png'
      },
      createdAt: now
    };
    if (recurrence) tabData.recurrence = recurrence;
```

### Step 5: Show 🔁 badge in the scheduled list

In `createScheduledTabItem`, find where `time.textContent` is set:

```javascript
  time.textContent = formatScheduledTime(tabData.scheduledTime);
```

Replace it with:

```javascript
  const recurBadge = tabData.recurrence ? '<span class="recurrence-badge">🔁</span>' : '';
  time.innerHTML = formatScheduledTime(tabData.scheduledTime) + recurBadge;
```

### Step 6: Reload and manually verify interactivity

1. Reload the extension
2. Open the popup on any webpage
3. Toggle on Repeat → panel appears
4. Select "Custom" → day pills appear
5. Click day pills → they turn blue when selected, back to white when clicked again
6. Select "End on" → date picker appears
7. Toggle off Repeat → panel hides

### Step 7: Commit

```bash
git add popup/popup.js
git commit -m "feat: wire up recurrence panel and pass recurrence data in scheduleTab"
```

---

## Task 4: Add next-occurrence calculator to background.js

**Files:**
- Modify: `background.js`

### Step 1: Add `calculateNextOccurrence` function

Add this function near the bottom of `background.js`, before the `isInvalidUrlForScheduling` function:

```javascript
// ============================================================
// Recurrence Logic
// ============================================================

// Given a recurrence config and the time that just fired, return
// the next occurrence timestamp. Returns null if past end date.
function calculateNextOccurrence(recurrence, fromTime) {
  const { pattern, days, time, endDate } = recurrence;
  const [hours, minutes] = time.split(':').map(Number);

  // Start from the day after fromTime
  const base = new Date(fromTime);
  base.setHours(hours, minutes, 0, 0);

  let next = new Date(base);

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekdays': {
      // Advance until we land on Mon-Fri
      next.setDate(next.getDate() + 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;

    case 'custom': {
      if (!days || days.length === 0) return null;
      // Find the soonest day-of-week in `days` strictly after today
      next.setDate(next.getDate() + 1);
      let attempts = 0;
      while (!days.includes(next.getDay())) {
        next.setDate(next.getDate() + 1);
        if (++attempts > 7) return null; // safety
      }
      break;
    }

    default:
      return null;
  }

  const nextTime = next.getTime();

  // Check end date
  if (endDate && nextTime > endDate) return null;

  return nextTime;
}
```

### Step 2: Reload and spot-check via DevTools

1. Reload the extension
2. Open the service worker DevTools (`chrome://extensions` → service worker)
3. In the console, test the function manually:

```javascript
// Daily: should return a timestamp ~24h from now
calculateNextOccurrence({ pattern: 'daily', time: '09:00', days: [], endDate: null }, Date.now())

// Weekdays from Friday: should skip to Monday
const friday = new Date(); friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7); friday.setHours(9,0,0,0);
calculateNextOccurrence({ pattern: 'weekdays', time: '09:00', days: [], endDate: null }, friday.getTime())

// Custom [Mon=1, Wed=3]: should land on next Mon or Wed
calculateNextOccurrence({ pattern: 'custom', time: '09:00', days: [1, 3], endDate: null }, Date.now())

// Past end date: should return null
calculateNextOccurrence({ pattern: 'daily', time: '09:00', days: [], endDate: Date.now() - 1000 }, Date.now())
```

Each result should be a future timestamp (or null for the last one).

### Step 3: Commit

```bash
git add background.js
git commit -m "feat: add calculateNextOccurrence helper to background.js"
```

---

## Task 5: Reschedule recurring tabs when alarm fires

**Files:**
- Modify: `background.js`

### Step 1: Update `processPendingAlarms` to handle recurrence

In `processPendingAlarms`, find the cleanup section for a **single alarm** (around line 124):

```javascript
      // Clean up
      delete scheduledTabs[alarmId];
```

Replace it with:

```javascript
      // If recurring, reschedule; otherwise delete
      if (tabData.recurrence) {
        const nextTime = calculateNextOccurrence(tabData.recurrence, tabData.scheduledTime);
        if (nextTime) {
          const randomId = Math.random().toString(36).substring(2, 8);
          const newAlarmId = `alarm_${nextTime}_${randomId}`;
          const newTabData = { ...tabData, alarmId: newAlarmId, scheduledTime: nextTime };
          delete scheduledTabs[alarmId];
          scheduledTabs[newAlarmId] = newTabData;
          await chrome.alarms.create(newAlarmId, { when: nextTime });
        } else {
          delete scheduledTabs[alarmId];
        }
      } else {
        delete scheduledTabs[alarmId];
      }
```

### Step 2: Update the multiple-alarms cleanup section

In `processPendingAlarms`, find the cleanup loop for **multiple alarms** (around line 163):

```javascript
      // Clean up all
      for (const { alarmId } of alarmsToProcess) {
        delete scheduledTabs[alarmId];
      }
```

Replace it with:

```javascript
      // Clean up all; reschedule recurring ones
      for (const { alarmId, tabData } of alarmsToProcess) {
        if (tabData.recurrence) {
          const nextTime = calculateNextOccurrence(tabData.recurrence, tabData.scheduledTime);
          if (nextTime) {
            const randomId = Math.random().toString(36).substring(2, 8);
            const newAlarmId = `alarm_${nextTime}_${randomId}`;
            const newTabData = { ...tabData, alarmId: newAlarmId, scheduledTime: nextTime };
            delete scheduledTabs[alarmId];
            scheduledTabs[newAlarmId] = newTabData;
            await chrome.alarms.create(newAlarmId, { when: nextTime });
          } else {
            delete scheduledTabs[alarmId];
          }
        } else {
          delete scheduledTabs[alarmId];
        }
      }
```

### Step 3: Update notification for recurring tabs

In the **single alarm** branch, find:

```javascript
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tab Reopened',
        message: `Reopened: ${tabData.tabInfo.title}`,
        priority: 1
      });
```

Replace with:

```javascript
      const nextTime = tabData.recurrence
        ? calculateNextOccurrence(tabData.recurrence, tabData.scheduledTime)
        : null;
      const notifMessage = nextTime
        ? `Reopened: ${tabData.tabInfo.title} — repeats ${formatScheduledTimeForNotification(nextTime)}`
        : `Reopened: ${tabData.tabInfo.title}`;
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Tab Reopened',
        message: notifMessage,
        priority: 1
      });
```

### Step 4: Reload and verify — end-to-end test with a short interval

This requires a 1-minute wait. Do this test:

1. Reload the extension
2. Open the popup on any webpage (e.g. google.com)
3. Set custom time to 1 minute from now
4. Toggle on Repeat → select **Daily**
5. Click "Schedule & Close Tab"
6. Wait ~1 minute
7. Verify:
   - Tab reopens in new window ✓
   - Notification says "repeats tomorrow at [time]" ✓
   - In the popup's scheduled list, the same tab appears again with tomorrow's time ✓
   - The 🔁 badge is visible next to the time ✓
8. Cancel the recurring tab to clean up

### Step 5: Commit

```bash
git add background.js
git commit -m "feat: reschedule recurring tabs on alarm fire"
```

---

## Task 6: Handle recurring tabs in missed schedule reconciliation

**Files:**
- Modify: `background.js`

### Step 1: Update `reopenPastDueTabs` for recurring tabs

In `reopenPastDueTabs`, find the single-tab cleanup:

```javascript
      // Clean up
      delete scheduledTabs[alarmId];
```

Replace with:

```javascript
      // If recurring, schedule next future occurrence
      if (tabData.recurrence) {
        let nextTime = calculateNextOccurrence(tabData.recurrence, tabData.scheduledTime);
        // Keep advancing until we find a future occurrence
        while (nextTime && nextTime <= Date.now()) {
          nextTime = calculateNextOccurrence(tabData.recurrence, nextTime);
        }
        if (nextTime) {
          const randomId = Math.random().toString(36).substring(2, 8);
          const newAlarmId = `alarm_${nextTime}_${randomId}`;
          const newTabData = { ...tabData, alarmId: newAlarmId, scheduledTime: nextTime };
          delete scheduledTabs[alarmId];
          scheduledTabs[newAlarmId] = newTabData;
          await chrome.alarms.create(newAlarmId, { when: nextTime });
        } else {
          delete scheduledTabs[alarmId];
        }
      } else {
        delete scheduledTabs[alarmId];
      }
```

### Step 2: Apply the same pattern to the multiple-tab cleanup in `reopenPastDueTabs`

Find the multi-tab cleanup loop:

```javascript
      // Clean up all past-due tabs from storage
      for (const { alarmId } of pastDueTabs) {
        delete scheduledTabs[alarmId];
      }
```

Replace with:

```javascript
      // Clean up all past-due tabs; reschedule recurring ones
      for (const { alarmId, tabData } of pastDueTabs) {
        if (tabData.recurrence) {
          let nextTime = calculateNextOccurrence(tabData.recurrence, tabData.scheduledTime);
          while (nextTime && nextTime <= Date.now()) {
            nextTime = calculateNextOccurrence(tabData.recurrence, nextTime);
          }
          if (nextTime) {
            const randomId = Math.random().toString(36).substring(2, 8);
            const newAlarmId = `alarm_${nextTime}_${randomId}`;
            const newTabData = { ...tabData, alarmId: newAlarmId, scheduledTime: nextTime };
            delete scheduledTabs[alarmId];
            scheduledTabs[newAlarmId] = newTabData;
            await chrome.alarms.create(newAlarmId, { when: nextTime });
          } else {
            delete scheduledTabs[alarmId];
          }
        } else {
          delete scheduledTabs[alarmId];
        }
      }
```

### Step 3: Reload and verify missed recurrence

1. Schedule a recurring tab for 1 minute from now
2. Close Chrome entirely
3. Wait 2 minutes
4. Reopen Chrome
5. Verify:
   - The missed tab opens once (not multiple times) ✓
   - The scheduled list shows the *next* future occurrence ✓
   - No orphaned alarms ✓

### Step 4: Commit

```bash
git add background.js
git commit -m "feat: handle missed recurring schedules on browser restart"
```

---

## Task 7: Final verification and cleanup

### Step 1: Full manual test checklist

- [ ] **Daily repeat**: Schedule a tab 1 min out, daily repeat. Fires → reopens → next occurrence appears in list for tomorrow same time
- [ ] **Weekdays**: Schedule for Friday, weekdays pattern → after firing, next occurrence is Monday
- [ ] **Weekly**: Schedule for Tuesday, weekly → after firing, next is Tuesday +7 days
- [ ] **Custom days (Mon/Wed/Fri)**: Schedule on Monday → after firing, next is Wednesday
- [ ] **End date respected**: Set end date to yesterday → tab fires, no next occurrence scheduled, entry removed
- [ ] **Cancel works**: Recurring tab in list → Cancel → removed, no future alarms
- [ ] **🔁 badge shows**: Recurring tabs show 🔁 in scheduled list; one-time tabs do not
- [ ] **Missed recurrence**: Close Chrome, reopen after scheduled time → fires once, next future occurrence scheduled
- [ ] **Non-recurring unaffected**: Schedule a one-time tab → still works exactly as before
- [ ] **Dark mode**: Recurrence panel looks correct in dark theme

### Step 2: Update CHANGELOG.md

Add a new entry at the top of `CHANGELOG.md`:

```markdown
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
```

### Step 3: Update version in manifest.json

Change `"version": "1.11.0"` to `"version": "1.12.0"` in `manifest.json`.

### Step 4: Update version badge in README.md

Change the version badge URL from `version-1.11.0-green` to `version-1.12.0-green`.

### Step 5: Final commit

```bash
git add CHANGELOG.md manifest.json README.md
git commit -m "feat: release recurring schedules as v1.12.0"
git push
```
