# GestureHeal — AI Gesture-Based Medical Assist System
## Complete Project Report

---

## 1. Executive Summary

**GestureHeal** is an AI-powered real-time gesture recognition system enabling patients—especially deaf, mute, elderly, or mobility-limited users—to communicate critical medical needs using hand gestures.

**Key Innovation**: Browser-based ML inference using MediaPipe + TensorFlow.js for instant, offline-capable gesture recognition.

---

## 2. Problem Statement

### The Communication Gap in Healthcare

| Patient Group | Challenge |
|--------------|-----------|
| Deaf & Mute | Cannot use voice-based systems |
| Stroke Patients | Speech/motor impairment |
| Elderly Users | Low tech literacy, tremors |
| Emergency Cases | Panic state, unable to type |
| ICU/Ventilated | Physical constraints |

**Current Solutions Fail Because:**
- Typing is slow during emergencies
- Speech recognition requires verbal ability
- Sign language interpreters aren't always available
- Existing apps require complex navigation

---

## 3. Solution Overview

### GestureHeal Pipeline

```
Webcam → MediaPipe Hands → 21 Landmarks → ML Model → Gesture → Medical Action
```

### Supported Gestures

| Gesture | Medical Action |
|---------|---------------|
| YES | Confirm symptom/treatment |
| NO | Cancel/reject |
| HELP | Trigger emergency alert |
| PAIN | Mark pain symptom |
| NONE | Idle state |

---

## 4. Technical Architecture

### 4.1 Hand Tracking Engine
- **Technology**: MediaPipe Hands
- **Output**: 21 hand landmarks (x, y, z each) = 63 features
- **Advantages**: Fast, browser-ready, no training needed

### 4.2 Feature Engineering
```
Raw Landmarks → Wrist Origin → Normalization → 63-Feature Vector
```
- Rotation invariant
- Distance invariant
- Scale normalized to [-1, 1]

### 4.3 ML Model Architecture
```
Input Layer: 63 features
    ↓
Dense(256) → BatchNorm → Dropout(0.3)
    ↓
Dense(128) → BatchNorm → Dropout(0.3)
    ↓
Dense(64) → Dropout(0.2)
    ↓
Output: Softmax (5 classes)
```

### 4.4 Training Configuration
| Parameter | Value |
|-----------|-------|
| Optimizer | Adam |
| Learning Rate | 0.001 |
| Loss | Sparse Categorical Crossentropy |
| Epochs | 80-120 |
| Early Stopping | Yes |
| Class Weights | Balanced |

### 4.5 Prediction Stability System

**Three-Layer Stabilization:**

1. **Confidence Gate**: Reject predictions < 75% confidence
2. **Temporal Smoothing**: Majority vote over last 5 frames
3. **Trigger Debounce**: Prevent repeated firing

---

## 5. System Modules

| Module | Function |
|--------|----------|
| Hand Tracking | MediaPipe landmark extraction |
| Feature Engine | Normalize landmarks to ML features |
| Dataset Builder | Custom capture tool for training data |
| ML Classifier | Dense neural network (TensorFlow) |
| TFJS Exporter | Convert to browser-compatible model |
| Prediction Engine | Real-time browser inference |
| Stability Pipeline | Smoothing + debounce |
| UI Layer | React-based patient/doctor interface |
| Emergency Mode | HELP gesture triggers alerts |

---

## 6. Dataset

### Collection Method
- Custom webcam capture tool
- MediaPipe extracts landmarks in real-time
- Auto-saves 63 features + label to CSV

### Sample Distribution
| Gesture | Samples |
|---------|---------|
| YES | 800-1200 |
| NO | 800-1200 |
| NONE | 1200-2000 |
| PAIN | 600+ |
| HELP | 600+ |

---

## 7. Frontend Application

### Technology Stack
- **Framework**: React + Vite
- **Styling**: Vanilla CSS with CSS Variables
- **Icons**: Custom SVG components

### Key Screens
1. **Login**: Patient/Doctor role selection
2. **Patient Dashboard**: Emergency start, doctor cards, appointments
3. **Camera View**: Live gesture detection, emergency grid
4. **Notification Panel**: Doctor messages (backend-ready)

---

## 8. Evaluation Metrics

| Metric | Target |
|--------|--------|
| Accuracy | > 90% |
| False Trigger Rate | < 5% |
| NONE Rejection | High |
| Inference Time | < 50ms |

---

## 9. Innovation Highlights

✅ Landmark-based ML (not image CNN)  
✅ Real-time browser inference  
✅ Medical gesture vocabulary  
✅ Multi-layer stabilization  
✅ Accessibility-first design  
✅ Offline capable  
✅ Low compute requirements  

---

## 10. Known Limitations

- Limited gesture vocabulary (5 gestures)
- Single hand detection only
- Camera dependent
- Not full sign language (yet)

---

## 11. Future Roadmap

| Phase | Feature |
|-------|---------|
| v2.0 | Expanded gesture library |
| v2.5 | Sentence builder from gestures |
| v3.0 | Sign language avatar responses |
| v3.5 | Mobile app (React Native) |
| v4.0 | Hospital system integration |

---

## 12. Impact Statement

GestureHeal bridges the communication gap for:
- **6.3M+ deaf Indians** lacking instant medical communication
- **Stroke patients** with speech impairment
- **ICU patients** unable to speak
- **Elderly users** with low tech literacy

**"Every hand gesture can save a life."**

---

## 13. Team & Credits

**Project**: GestureHeal  
**Category**: AI/ML + Healthcare + Accessibility  
**Built With**: React, TensorFlow.js, MediaPipe, Vite  

---

*Document Generated: February 2026*
