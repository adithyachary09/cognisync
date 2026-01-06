# CogniSync Single-Transaction Settings Architecture

## Overview

This document describes the atomic settings commit pattern implemented in CogniSync, ensuring all preference changes are persisted and applied globally in a single transaction.

## Architecture Pattern

### 1. Single Persistence Write
All settings changes use one `localStorage.setItem()` call:
\`\`\`typescript
localStorage.setItem('cognisync:settings', JSON.stringify(settings))
\`\`\`

### 2. Single Event Dispatch
After persistence, one custom event notifies all listeners:
\`\`\`typescript
window.dispatchEvent(new CustomEvent('cognisync:settings:updated', { detail: settings }))
\`\`\`

### 3. Single State Update
In-memory state is updated once via `ThemeContext`:
\`\`\`typescript
setSettings(settingsToSave)
\`\`\`

## API Usage

### Using `useTheme()` Hook
\`\`\`typescript
import { useTheme } from '@/lib/theme-context'

export function MyComponent() {
  const { settings, updateSettings, applySettings } = useTheme()

  const handleChange = () => {
    // Update local form state (does not persist yet)
    updateSettings({ darkMode: true })
    
    // When user clicks "Apply Changes", commit atomically
    applySettings() // Single localStorage write + event dispatch + state sync
  }

  return (...)
}
\`\`\`

### Using `useNotification()` Hook
\`\`\`typescript
import { useNotification } from '@/lib/notification-context'

export function MyComponent() {
  const { showNotification } = useNotification()

  const handleSuccess = () => {
    showNotification({
      type: 'success',
      message: 'Your environment has been updated.',
      duration: 2200
    })
  }

  return (...)
}
\`\`\`

## Data Flow

1. **User modifies settings** → `updateSettings()` updates local component state only
2. **User clicks "Apply Changes"** → `applySettings()` triggers:
   - `localStorage.setItem()` - atomic persist
   - `window.dispatchEvent()` - notify listeners
   - `setSettings()` - sync in-memory state
   - `showNotification()` - confirmation feedback
3. **Root listener on `cognisync:settings:updated`** → applies CSS variables, classes, and theme globally
4. **On app boot** → reads settings from localStorage and applies before first paint

## Settings Structure

\`\`\`typescript
interface ThemeSettings {
  darkMode: boolean        // Light/dark mode toggle
  fontSize: number         // 12-20px (5 steps)
  colorTheme: 'blue' | 'purple' | 'teal'  // Primary color scheme
  username: string         // User's display name
}
\`\`\`

## Notification Types

- **success**: "Your environment has been updated."
- **error**: "Something went wrong — please try again."
- **warning**: "Are you sure? This will clear your saved data."
- **info**: "Changes saved."

Center-overlay card with auto-dismiss (2200ms default), close button, aria-live region.

## Download & Delete Data

### CSV Download
- Reads entries from `journal-entries` localStorage
- Columns: Date, Journal Text, Sentiment, Streak Count
- File: `cognisync-report-YYYYMMDD.csv`
- Shows success notification on completion

### Delete Data
- Clears `journal-entries`, `streak-count`, `last-entry-date`
- Does NOT clear settings (user may restore entries later)
- Shows confirmation dialog before deletion
- Triggers success notification: "All data has been cleared. Your wellness journey starts fresh."

## Test Checklist

- [ ] Load app → theme/font/color match last-saved settings (no clicks needed)
- [ ] Change multiple settings → click Apply Changes once → all changes immediately visible
- [ ] Click Apply Changes again → app remains in new state (no extra clicks)
- [ ] No browser `alert()` calls; all info uses center-overlay notifications
- [ ] Download CSV contains date, journalText, sentiment, streakCount columns
- [ ] Delete data clears entries and shows success notification

## Implementation Files

- `lib/notification-context.tsx` - NotificationProvider + useNotification hook
- `lib/theme-context.tsx` - ThemeProvider + useTheme hook (single transaction logic)
- `app/layout.tsx` - Root providers wrapper
- `components/pages/settings-page.tsx` - Settings UI with "Apply Changes" button
- `components/pages/report-page.tsx` - CSV export with notifications
- `lib/sentiment.ts` - Text analysis utility for journal entries

---

**Atomic Pattern:** One localStorage write + one event + one state update = no multi-click issues.
