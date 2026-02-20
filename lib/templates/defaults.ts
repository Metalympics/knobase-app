export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultContent: string;
  isCustom?: boolean;
}

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Capture meeting agenda, attendees, and action items",
    icon: "📋",
    defaultContent: `# Meeting Notes

## Date
${new Date().toLocaleDateString()}

## Attendees
- 

## Agenda
1. 

## Discussion


## Action Items
- [ ] 
- [ ] 

## Next Steps

`,
  },
  {
    id: "project-brief",
    name: "Project Brief",
    description: "Define project goals, scope, and timeline",
    icon: "🎯",
    defaultContent: `# Project Brief

## Overview


## Objectives
1. 
2. 
3. 

## Scope
### In Scope
- 

### Out of Scope
- 

## Timeline
| Phase | Start | End | Status |
|-------|-------|-----|--------|
| Planning | | | |
| Execution | | | |
| Review | | | |

## Success Metrics
- 

## Risks
- 

## Team
- **Lead:** 
- **Members:** 
`,
  },
  {
    id: "daily-journal",
    name: "Daily Journal",
    description: "Daily reflection and planning template",
    icon: "📝",
    defaultContent: `# Daily Journal — ${new Date().toLocaleDateString()}

## Morning Intentions
What do I want to accomplish today?
- 

## Gratitude
Three things I'm grateful for:
1. 
2. 
3. 

## Tasks
- [ ] 
- [ ] 
- [ ] 

## Notes & Ideas


## Evening Reflection
How did the day go?

`,
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Technical documentation with sections",
    icon: "📖",
    defaultContent: `# Title

## Overview
Brief description of what this document covers.

## Getting Started
### Prerequisites
- 

### Installation
\`\`\`
\`\`\`

## Usage


## API Reference
| Method | Endpoint | Description |
|--------|----------|-------------|
| | | |

## Examples


## Troubleshooting


## FAQ

`,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Free-form ideation and mind mapping",
    icon: "💡",
    defaultContent: `# Brainstorm Session

## Topic


## Ideas
1. 
2. 
3. 

## Pros & Cons
| Idea | Pros | Cons |
|------|------|------|
| | | |

## Next Steps
- [ ] 

`,
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Review your week and plan ahead",
    icon: "📊",
    defaultContent: `# Weekly Review

## Week of ${new Date().toLocaleDateString()}

## Completed This Week
- 

## In Progress
- 

## Wins
- 

## Challenges
- 

## Lessons Learned
- 

## Next Week's Priorities
1. 
2. 
3. 

`,
  },
];
