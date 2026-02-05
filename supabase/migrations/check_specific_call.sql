SELECT id, doctor_id, patient_id, status, created_at FROM emergency_calls WHERE id::text LIKE 'e028bc13%';
