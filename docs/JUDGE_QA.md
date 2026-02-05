# GestureHeal — Judge Q&A Master Sheet

---

## 🎯 Technical Questions

---

### Q1: Why MediaPipe instead of training your own hand detection?

**Answer:**
MediaPipe provides pre-trained, production-grade hand tracking that:
- Works in real-time in browsers
- Gives 21 precise landmarks per hand
- Requires zero training from us
- Is lightweight and fast

We focus our ML on gesture classification, not hand detection.

---

### Q2: Why landmarks instead of image-based CNN?

**Answer:**
Landmark-based approach:
- 63 features vs thousands of pixels
- Faster inference
- Smaller model size
- Rotation/scale invariant after normalization
- Works on low-end devices

---

### Q3: How do you handle false positives?

**Answer:**
Three-layer stabilization:
1. **Confidence gate**: Only accept predictions >75%
2. **Temporal smoothing**: Majority vote over 5 frames
3. **Debounce**: Lock trigger for short window after firing

This reduces accidental triggers significantly.

---

### Q4: What's your model accuracy?

**Answer:**
- Training accuracy: ~95%
- Validation accuracy: >90%
- False trigger rate: <5%
- NONE class rejection: High priority

---

### Q5: Can it work offline?

**Answer:**
Yes. TensorFlow.js model runs entirely in browser. No server calls needed for:
- Hand detection
- Gesture recognition
- UI actions

Only backend features (appointments, notifications) need connectivity.

---

## 💡 Innovation Questions

---

### Q6: What's novel about your approach?

**Answer:**
- Landmark-based ML (not image CNN)
- Real-time browser inference
- Medical gesture vocabulary
- Multi-layer prediction stability
- Accessibility-first design

---

### Q7: How is this different from sign language apps?

**Answer:**
GestureHeal is:
- Focused on medical communication
- Designed for emergency use
- Simple 5-gesture vocabulary
- Integrated with healthcare workflows

Sign language apps need 100+ signs. We optimize for critical medical gestures.

---

## 🏥 Impact Questions

---

### Q8: Who is this for?

**Answer:**
- Deaf and mute patients
- Stroke survivors with speech impairment
- ICU/ventilated patients
- Elderly with low tech literacy
- Anyone in panic/emergency state

---

### Q9: How does this scale?

**Answer:**
- Browser-based = no app install
- Works on any device with camera
- Hospital can deploy via simple URL
- Low compute = works on old devices

---

### Q10: What's the real-world deployment plan?

**Answer:**
1. Pilot with local hospital
2. Validate with real patients
3. Add more gestures based on feedback
4. Integrate with hospital systems
5. Mobile app for ambulance use

---

## ⚠️ Limitation Questions

---

### Q11: What are the limitations?

**Answer (Be Honest):**
- Limited to 5 gestures currently
- Single hand detection only
- Requires camera access
- Not full sign language yet
- Lighting can affect accuracy

We have a clear roadmap to address these.

---

### Q12: What if the camera fails?

**Answer:**
- Emergency button always available
- Manual keyword selection grid
- System doesn't replace human care, it assists

---

## 🚀 Future Questions

---

### Q13: What's next?

**Answer:**
- More gesture vocabulary
- Two-hand detection
- Sentence builder from gestures
- Sign language avatar responses
- Mobile app
- Hospital EHR integration

---

### Q14: Can this be commercialized?

**Answer:**
Yes. Potential models:
- Hospital licensing
- Telemedicine integration
- Accessibility SaaS
- Government healthcare programs

---

## 🧠 Team Questions

---

### Q15: How did your team split the work?

**Answer:**
- **ML Lead**: Model training, data collection, TF.js export
- **Frontend Team**: React UI, gesture display, emergency flow
- **Integration**: Connect ML predictions to UI actions
- **Documentation**: Reports, PPT, demo prep

---

### Q16: What was the hardest challenge?

**Answer:**
Prediction stability. Initial model flickered between classes. We solved it with:
- Confidence thresholds
- Frame smoothing
- Trigger debounce

---

*Remember: Judges respect honesty. If you don't know, say "That's a great question, here's what we'd explore..."*
