# GestureHeal — PPT Content Outline

---

## Slide 1: Title

**GestureHeal**  
*AI Gesture-Based Medical Assist System*

"Where Hands Speak, Hearts Connect"

---

## Slide 2: The Problem

🚨 **6.3 Million deaf Indians lack instant medical communication**

- Speech impaired patients
- Stroke survivors
- ICU/ventilated patients
- Elderly with low tech literacy
- Emergency panic state

**Typing is slow. Speech doesn't work. Gestures are universal.**

---

## Slide 3: Our Solution

**Camera → AI → Gesture → Medical Action**

- Real-time hand gesture recognition
- Browser-based (no app install)
- Works offline
- 5 core medical gestures: YES, NO, HELP, PAIN, NONE

---

## Slide 4: How It Works

```
[Diagram]
Webcam → MediaPipe → 21 Landmarks → ML Model → Gesture → Action
```

- MediaPipe extracts hand landmarks
- Custom ML model classifies gestures
- Stabilization prevents false triggers
- UI triggers medical actions

---

## Slide 5: Technical Stack

| Layer | Technology |
|-------|------------|
| Hand Tracking | MediaPipe Hands |
| ML Model | TensorFlow / TF.js |
| Frontend | React + Vite |
| Inference | Browser-based |

---

## Slide 6: ML Model

**Architecture:**
- Input: 63 normalized features
- Dense layers: 256 → 128 → 64
- Output: 5-class softmax
- Accuracy: >90%

**Stability Pipeline:**
1. Confidence gate (>75%)
2. Temporal smoothing (5 frames)
3. Trigger debounce

---

## Slide 7: Demo Flow

1. Patient opens app
2. Logs in as Patient
3. Clicks "Start Emergency Communication"
4. Camera activates
5. Performs gesture (e.g., HELP)
6. System detects → sends alert

---

## Slide 8: Key Features

✅ Emergency gesture detection  
✅ Appointment booking  
✅ Doctor notification system  
✅ Patient dashboard  
✅ Accessibility-first design  

---

## Slide 9: Innovation Points

| What | Why It Matters |
|------|----------------|
| Landmark ML | Faster than CNN |
| Browser inference | No server needed |
| Stabilization | Reduces false triggers |
| Medical focus | Real-world application |

---

## Slide 10: Impact

- 🏥 Hospitals: faster patient communication
- 👴 Elderly care: simplified interaction
- 🚑 Emergency: instant alerts without speech
- ♿ Accessibility: inclusion for all

---

## Slide 11: Future Roadmap

| Phase | Feature |
|-------|---------|
| v2 | More gestures |
| v3 | Sign language avatar |
| v4 | Mobile app |
| v5 | Hospital integration |

---

## Slide 12: Team

**Team Name**: Core Z  
**Project**: GestureHeal  
**Category**: AI + Healthcare + Accessibility

---

## Slide 13: Thank You

**"Every hand gesture can save a life."**

🔗 Live Demo Available

---

*Presentation Notes: Keep slides visual, use icons, minimal text per slide.*
