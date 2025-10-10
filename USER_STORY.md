# NSTPlus User Story & Experiment Flow

## Overview
NSTPlus is a comprehensive experimental platform that captures facial expressions during two different types of effort tasks:
1. **Cognitive Effort**: Number Switching Task (NST) - odd/even number categorization
2. **Physical Effort**: Handgrip dynamometer task - sustained physical exertion

The system captures dual-camera footage throughout both tasks to analyze facial expressions associated with different types and levels of effort.

## Complete User Journey

### Phase 1: Participant Registration
**Goal**: Register participant and set up experimental environment

1. Participant enters ID (e.g., "P001")
2. Selects gender (M/F/O) - determines physical effort levels:
   - Male: Medium effort (Dot 2), High effort (Dot 3)
   - Female/Other: Low effort (Dot 1), Medium effort (Dot 2)
3. System creates participant directory structure
4. Cameras initialize automatically

### Phase 2: Camera Configuration
**Goal**: Ensure both cameras are properly positioned

1. System shows dual camera preview
2. **Main Camera**: Positioned to capture participant's face
3. **Equipment Camera**: Positioned to capture handgrip dynamometer dial
4. Participant/experimenter adjusts cameras as needed
5. System confirms camera readiness

### Phase 3: Neutral Expression Baseline (NEEDS IMPROVEMENT)
**Goal**: Capture baseline neutral expression for comparison

**Current State**: Single capture with 3-second countdown
**Proposed Enhancement**:
1. Display centered fixation cross for consistent eye orientation
2. Capture 5 neutral photos (instead of 1) with 2-second intervals
3. System averages these for more reliable baseline
4. Ensures eye gaze matches experimental conditions

**Instructions to Participant**:
- "Look at the center cross"
- "Keep a relaxed, neutral expression"
- "We'll take 5 photos for averaging"
- "Hold still during each capture"

### Phase 4: Task Randomization
**Goal**: Counterbalance task order across participants

System randomly assigns one of two orders:
- Order A: NST → Physical Effort
- Order B: Physical Effort → NST

### Phase 5A: Number Switching Task (NST)
**Goal**: Measure cognitive effort through digit categorization performance

#### Training Phase (NEEDS ENHANCEMENT)
**Current**: Brief instructions only
**Proposed**: Add interactive training
1. Show 10 practice digits with feedback
2. Display "Correct!" or "Incorrect - this was odd/even"
3. Show response time after each trial
4. Require 80% accuracy to proceed to main task

#### Main Task Instructions (NEEDS EXPANSION)
**Current**: Basic odd/even categorization instructions
**Proposed Enhanced Instructions**:
1. "Numbers will appear one at a time in the center"
2. "Press F for ODD numbers (1, 3, 5, 7, 9)"
3. "Press J for EVEN numbers (2, 4, 6, 8, 0)"
4. "Respond as quickly as possible while staying accurate"
5. "Keep your eyes on the center throughout"
6. "Your face will be photographed during some responses"
7. Show visual key mapping: [F] ← ODD | EVEN → [J]

#### Task Execution
1. Three trial blocks (Level 6, 4, 2 difficulty)
2. 15 digits per trial
3. Photos captured every 3rd digit
4. 1500ms digit display, 2000ms inter-trial delay
5. Real-time accuracy tracking

### Phase 5B: Physical Effort Task
**Goal**: Measure physical effort through handgrip exertion

#### Equipment Setup (NEEDS DOCUMENTATION)
**Proposed Setup Instructions**:
1. "Hold the handgrip dynamometer in your dominant hand"
2. "Rest your arm on the table, elbow at 90 degrees"
3. "The dial should be visible to the equipment camera"
4. "Adjust grip until comfortable"

#### Training Phase (NEEDS ENHANCEMENT)
**Current**: Two practice trials (Dot 1, Dot 3)
**Proposed Enhanced Training**:
1. Calibration squeeze: "Squeeze as hard as you can briefly"
2. Practice all three dots with visual feedback:
   - Dot 1 (Low): "Light squeeze - about 20% effort"
   - Dot 2 (Medium): "Moderate squeeze - about 50% effort"  
   - Dot 3 (High): "Strong squeeze - about 80% effort"
3. Show dial position feedback: "Too low" / "Perfect" / "Too high"
4. Practice holding for 3 seconds

#### Main Task Instructions (NEEDS EXPANSION)
**Current**: Basic squeeze instructions
**Proposed Enhanced Instructions**:
1. "You'll complete 5 repetitions at different effort levels"
2. "Each trial: Squeeze to reach the target dot"
3. "Hold the squeeze steady for 3 seconds"
4. "Release and rest for 10 seconds between trials"
5. "Your facial expression will be captured during squeezing"
6. Visual diagram of dynamometer dial with dots marked

#### Task Execution
1. 5 randomized trials (mix of assigned effort levels)
2. 3-second hold per trial
3. Photos captured at peak effort (2 seconds into hold)
4. 10-second rest periods
5. Visual countdown timers throughout

### Phase 6: Task Transition
**Goal**: Smooth transition between tasks

If first task completed:
1. "Great job! You've completed the first task"
2. "Take a brief rest if needed"
3. "Click 'Continue' when ready for the second task"

### Phase 7: Second Task
Participant completes whichever task they haven't done yet, following the same protocol

### Phase 8: Completion & Data Export
**Goal**: Finalize session and prepare data

1. "Experiment complete! Thank you for participating"
2. System processes all captured images
3. Creates ZIP archive with structure:
   ```
   P001_data.zip
   ├── neutral/
   │   ├── neutral_1_main.jpg
   │   ├── neutral_1_equipment.jpg
   │   └── ... (5 captures total)
   ├── nst/
   │   ├── trial_1_digit_0_main.jpg
   │   └── ...
   ├── physical_effort/
   │   ├── rep_1_dot2_main.jpg
   │   └── ...
   └── metadata.json
   ```
4. Automatic download initiated
5. Option to review captured images

## Technical Requirements

### Improvements Needed

1. **Neutral Capture Enhancement**
   - Implement 5-capture sequence
   - Add centered fixation cross
   - Calculate average neutral expression

2. **Training Scripts**
   - NST: Interactive practice with feedback
   - Physical Effort: Calibration and practice holds
   - Both: Ensure participant understanding before main task

3. **Instruction Clarity**
   - Add visual aids (key mappings, dial positions)
   - Include timing information
   - Specify eye gaze requirements

4. **User Feedback**
   - Real-time performance metrics
   - Clear progress indicators
   - Success/completion confirmations

### Data Quality Measures
- Consistent lighting checks
- Camera position validation
- Automatic image quality assessment
- Backup captures if quality issues detected

## Researcher Dashboard (Future Enhancement)
- Real-time experiment monitoring
- Participant progress tracking
- Data quality indicators
- Quick access to exported data
- Session logs and error reports

## Error Handling & Recovery
- Camera disconnection: Pause and reconnect
- Missed responses: Continue with next trial
- Image capture failure: Retry capture
- System crash: Resume from last completed trial

## Accessibility Considerations
- Adjustable font sizes
- High contrast mode option
- Keyboard-only navigation
- Screen reader compatibility for instructions
- Alternative response methods if needed