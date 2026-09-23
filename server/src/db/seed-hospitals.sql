-- ============================================================================
-- SEED / SAMPLE DATA — HOSPITALS, DEPARTMENTS, DOCTORS (TAMIL NADU, INDIA)
-- ----------------------------------------------------------------------------
-- This file contains FICTITIOUS SAMPLE DATA for TESTING ONLY. Every hospital,
-- department, doctor and address is made up and clearly marked "(Sample)".
-- Nothing here reflects a real facility, doctor or contact number.
--
-- All recommendations and the appointment booking catalog are restricted to
-- hospitals located in Tamil Nadu, India (see hospital.model.ts WHERE state).
--
-- Applied automatically by `npm run db:init` AFTER server/src/db/schema.sql.
-- All statements are idempotent (ON CONFLICT DO NOTHING).
-- ============================================================================

-- Remove the earlier non-Tamil Nadu sample set (if present) so that patient
-- recommendations only ever return Tamil Nadu hospitals. Departments/doctors
-- cascade with their hospital. Appointments referencing a de-listed sample
-- hospital must be cleared before this DELETE succeeds.
DELETE FROM hospitals
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006'
);

-- Sample hospitals across Tamil Nadu districts (city + district per location).
INSERT INTO hospitals (id, name, city, district, state, address, phone, email, website, availability)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Metro Citycare Hospital (Sample)', 'Chennai', 'Chennai', 'Tamil Nadu', '12 Anna Salai, Chennai, Tamil Nadu 600002', '(044) 2400-0001', 'contact@metrocitycare.sample.in', 'www.metrocitycare.sample.in', 'Emergency: 24x7. OPD: Mon-Sat 8:00 AM - 8:00 PM'),
  ('20000000-0000-0000-0000-000000000002', 'Prime Medicity Hospital (Sample)', 'Coimbatore', 'Coimbatore', 'Tamil Nadu', '88 Avinashi Road, Coimbatore, Tamil Nadu 641018', '(0422) 2435-0002', 'care@primemedicity.sample.in', 'www.primemedicity.sample.in', 'Mon-Sun 7:00 AM - 9:00 PM'),
  ('20000000-0000-0000-0000-000000000003', 'Sunshine Multispeciality Hospital (Sample)', 'Madurai', 'Madurai', 'Tamil Nadu', '45 Alagarkoil Road, Madurai, Tamil Nadu 625002', '(0452) 2310-0003', 'hello@sunshinehospital.sample.in', 'www.sunshinehospital.sample.in', 'Mon-Sat 9:00 AM - 7:00 PM'),
  ('20000000-0000-0000-0000-000000000004', 'Green Valley Hospital (Sample)', 'Tiruchirappalli', 'Tiruchirappalli', 'Tamil Nadu', '317 Thennur High Road, Trichy, Tamil Nadu 620017', '(0431) 2405-0004', 'info@greenvalleytrichy.sample.in', 'www.greenvalleytrichy.sample.in', 'Mon-Sat 9:00 AM - 6:00 PM'),
  ('20000000-0000-0000-0000-000000000005', 'Lotus Care Hospital (Sample)', 'Salem', 'Salem', 'Tamil Nadu', '221 Omalur Main Road, Salem, Tamil Nadu 636004', '(0427) 2266-0005', 'info@lotuscare.sample.in', 'www.lotuscare.sample.in', 'Mon-Sat 9:00 AM - 6:00 PM'),
  ('20000000-0000-0000-0000-000000000006', 'Hilltop City Health Center (Sample)', 'Vellore', 'Vellore', 'Tamil Nadu', '56 Katpadi Road, Vellore, Tamil Nadu 632004', '(0416) 2233-0006', 'care@hilltopcity.sample.in', 'www.hilltopcity.sample.in', 'Mon-Sat 8:00 AM - 7:00 PM'),
  ('20000000-0000-0000-0000-000000000007', 'Nellai General Hospital (Sample)', 'Tirunelveli', 'Tirunelveli', 'Tamil Nadu', '14 Trivandrum Road, Tirunelveli, Tamil Nadu 627007', '(0462) 2573-0007', 'help@nellaigeneral.sample.in', 'www.nellaigeneral.sample.in', 'Mon-Sat 9:00 AM - 6:00 PM'),
  ('20000000-0000-0000-0000-000000000008', 'Kongu Lifeline Hospital (Sample)', 'Erode', 'Erode', 'Tamil Nadu', '77 Chennimalai Road, Erode, Tamil Nadu 638001', '(0424) 2211-0008', 'info@kongulifeline.sample.in', 'www.kongulifeline.sample.in', 'Mon-Sat 9:00 AM - 7:00 PM'),
  ('20000000-0000-0000-0000-000000000009', 'Chola Wellness Hospital (Sample)', 'Thanjavur', 'Thanjavur', 'Tamil Nadu', '30 Medical College Road, Thanjavur, Tamil Nadu 613004', '(04362) 2300-0009', 'care@cholawellness.sample.in', 'www.cholawellness.sample.in', 'Mon-Sat 9:00 AM - 5:00 PM'),
  ('20000000-0000-0000-0000-000000000010', 'Harbor Coast Medical Center (Sample)', 'Thoothukudi', 'Thoothukudi', 'Tamil Nadu', '92 Beach Road, Thoothukudi, Tamil Nadu 628001', '(0461) 2352-0010', 'info@harborcoast.sample.in', 'www.harborcoast.sample.in', 'Mon-Sat 9:00 AM - 6:00 PM')
ON CONFLICT (name, city) DO NOTHING;

-- Every seeded hospital offers the same standard department set so that the
-- specialty recommended by the AI assessment always finds matching results.
INSERT INTO hospital_departments (hospital_id, name, description)
SELECT h.id, d.name, d.description
FROM hospitals h
CROSS JOIN (
  VALUES
    ('Cardiology', 'Heart and cardiovascular care'),
    ('Neurology', 'Nervous system, brain and nerve disorders'),
    ('Pulmonology', 'Lungs, airways and respiratory conditions'),
    ('Gastroenterology', 'Digestive system and stomach conditions'),
    ('Orthopedics', 'Bones, joints, muscles and spine'),
    ('Dermatology', 'Skin, hair and nail conditions'),
    ('Endocrinology', 'Hormones, diabetes and metabolic conditions'),
    ('ENT', 'Ear, nose and throat conditions'),
    ('Urology', 'Urinary tract and male reproductive health'),
    ('Gynecology', 'Women''s reproductive health'),
    ('Ophthalmology', 'Eye and vision care'),
    ('Psychiatry', 'Mental health and emotional wellbeing'),
    ('General Medicine', 'First-line general and internal medicine consultations')
) AS d(name, description)
ON CONFLICT (hospital_id, name) DO NOTHING;

-- A named doctor is only listed for a subset of departments at each hospital,
-- mirroring the real world where not every department publicizes its staff.
-- All doctor names and credentials are fictitious sample data.
INSERT INTO doctors (hospital_id, department_id, name, title, specialty, experience, availability)
SELECT h.id, d.id, v.dr_name, v.dr_title, v.dr_specialty, v.dr_experience, v.dr_availability
FROM hospitals h
JOIN hospital_departments d ON d.hospital_id = h.id
JOIN (
  VALUES
    ('Metro Citycare Hospital (Sample)', 'Cardiology', 'Dr. Anitha Raman', 'MD', 'Interventional Cardiologist', 12, 'Mon-Fri 9:00 AM - 5:00 PM'),
    ('Metro Citycare Hospital (Sample)', 'Endocrinology', 'Dr. Karthik Subramani', 'MD', 'Endocrinologist', 9, 'Tue-Sat 10:00 AM - 4:00 PM'),
    ('Metro Citycare Hospital (Sample)', 'General Medicine', 'Dr. Meenakshi Shankar', 'MD', 'Internal Medicine Physician', 14, 'Mon-Fri 8:00 AM - 6:00 PM'),
    ('Metro Citycare Hospital (Sample)', 'Pulmonology', 'Dr. Ramesh Iyer', 'MD', 'Pulmonologist', 11, 'Mon-Wed 9:00 AM - 3:00 PM'),
    ('Metro Citycare Hospital (Sample)', 'Gastroenterology', 'Dr. Divya Nair', 'DM', 'Gastroenterologist', 8, 'Tue-Thu 10:00 AM - 4:00 PM'),
    ('Prime Medicity Hospital (Sample)', 'Cardiology', 'Dr. Suresh Pandian', 'DM', 'Cardiologist', 16, 'Mon-Sat 9:00 AM - 5:00 PM'),
    ('Prime Medicity Hospital (Sample)', 'Neurology', 'Dr. Lakshmi Venkataraman', 'DM', 'Neurologist', 10, 'Tue-Sat 10:00 AM - 4:00 PM'),
    ('Prime Medicity Hospital (Sample)', 'Orthopedics', 'Dr. Balaji Raghavan', 'MS', 'Orthopedic Surgeon', 13, 'Wed-Sat 9:00 AM - 3:00 PM'),
    ('Prime Medicity Hospital (Sample)', 'Gynecology', 'Dr. Kavitha Sridhar', 'MD', 'Obstetrician-Gynecologist', 11, 'Mon-Thu 9:00 AM - 2:00 PM'),
    ('Prime Medicity Hospital (Sample)', 'General Medicine', 'Dr. Arul Das', 'MD', 'General Physician', 15, 'Mon-Fri 8:00 AM - 6:00 PM'),
    ('Sunshine Multispeciality Hospital (Sample)', 'Dermatology', 'Dr. Farida Begum', 'MD', 'Dermatologist', 7, 'Mon-Wed 9:00 AM - 1:00 PM'),
    ('Sunshine Multispeciality Hospital (Sample)', 'ENT', 'Dr. Vignesh Kumar', 'MS', 'ENT Specialist', 9, 'Mon-Sat 10:00 AM - 4:00 PM'),
    ('Sunshine Multispeciality Hospital (Sample)', 'Pulmonology', 'Dr. Mythili Anand', 'MD', 'Pulmonologist', 10, 'Tue-Fri 9:00 AM - 3:00 PM'),
    ('Sunshine Multispeciality Hospital (Sample)', 'Psychiatry', 'Dr. Rajendran Ganesan', 'MD', 'Psychiatrist', 12, 'Mon-Fri 10:00 AM - 5:00 PM'),
    ('Sunshine Multispeciality Hospital (Sample)', 'General Medicine', 'Dr. Pushpa Krishnan', 'MD', 'General Physician', 8, 'Mon-Sat 9:00 AM - 6:00 PM'),
    ('Green Valley Hospital (Sample)', 'Gastroenterology', 'Dr. Vinay Mohan', 'DM', 'Gastroenterologist', 9, 'Mon-Thu 10:00 AM - 4:00 PM'),
    ('Green Valley Hospital (Sample)', 'Urology', 'Dr. Deepa Sankar', 'MS', 'Urologist', 11, 'Mon-Fri 9:00 AM - 3:00 PM'),
    ('Green Valley Hospital (Sample)', 'Endocrinology', 'Dr. Harish Babu', 'MD', 'Endocrinologist', 8, 'Tue-Sat 9:00 AM - 4:00 PM'),
    ('Green Valley Hospital (Sample)', 'Ophthalmology', 'Dr. Nithya Ramanan', 'MS', 'Ophthalmologist', 10, 'Mon-Fri 10:00 AM - 5:00 PM'),
    ('Lotus Care Hospital (Sample)', 'Cardiology', 'Dr. Syed Ali', 'DM', 'Cardiologist', 13, 'Mon-Sat 9:00 AM - 5:00 PM'),
    ('Lotus Care Hospital (Sample)', 'Orthopedics', 'Dr. Jenifer Thomas', 'MS', 'Orthopedic Surgeon', 9, 'Tue-Sat 10:00 AM - 3:00 PM'),
    ('Lotus Care Hospital (Sample)', 'Dermatology', 'Dr. Prabakaran Selvam', 'MD', 'Dermatologist', 6, 'Mon-Wed 9:00 AM - 1:00 PM'),
    ('Lotus Care Hospital (Sample)', 'General Medicine', 'Dr. Uma Maheshwari', 'MD', 'General Physician', 12, 'Mon-Fri 8:00 AM - 6:00 PM'),
    ('Hilltop City Health Center (Sample)', 'Neurology', 'Dr. Senthil Kumaran', 'DM', 'Neurologist', 12, 'Mon-Fri 10:00 AM - 4:00 PM'),
    ('Hilltop City Health Center (Sample)', 'Pulmonology', 'Dr. Revathi Manohar', 'MD', 'Pulmonologist', 9, 'Tue-Sat 9:00 AM - 3:00 PM'),
    ('Hilltop City Health Center (Sample)', 'Gynecology', 'Dr. Bharathi Devi', 'MD', 'Obstetrician-Gynecologist', 14, 'Mon-Thu 9:00 AM - 2:00 PM'),
    ('Hilltop City Health Center (Sample)', 'General Medicine', 'Dr. Chandrasekar Rao', 'MD', 'General Physician', 15, 'Mon-Fri 8:00 AM - 6:00 PM'),
    ('Nellai General Hospital (Sample)', 'Gastroenterology', 'Dr. Ilango Murugesan', 'DM', 'Gastroenterologist', 8, 'Tue-Thu 10:00 AM - 4:00 PM'),
    ('Nellai General Hospital (Sample)', 'ENT', 'Dr. Sharmila B', 'MS', 'ENT Specialist', 7, 'Mon-Sat 10:00 AM - 4:00 PM'),
    ('Nellai General Hospital (Sample)', 'Urology', 'Dr. Anandhakumar V', 'MS', 'Urologist', 10, 'Mon-Fri 9:00 AM - 3:00 PM'),
    ('Nellai General Hospital (Sample)', 'General Medicine', 'Dr. Gayathri Sivakumar', 'MD', 'General Physician', 11, 'Mon-Sat 9:00 AM - 6:00 PM'),
    ('Kongu Lifeline Hospital (Sample)', 'Cardiology', 'Dr. Murali Krishnan', 'DM', 'Cardiologist', 14, 'Mon-Sat 9:00 AM - 5:00 PM'),
    ('Kongu Lifeline Hospital (Sample)', 'Endocrinology', 'Dr. Swathi Prakash', 'MD', 'Endocrinologist', 7, 'Tue-Sat 9:00 AM - 4:00 PM'),
    ('Kongu Lifeline Hospital (Sample)', 'Orthopedics', 'Dr. Rajkumar Perumal', 'MS', 'Orthopedic Surgeon', 10, 'Wed-Fri 9:00 AM - 3:00 PM'),
    ('Kongu Lifeline Hospital (Sample)', 'Psychiatry', 'Dr. Vasanthi Murthy', 'MD', 'Psychiatrist', 9, 'Mon-Fri 10:00 AM - 5:00 PM'),
    ('Chola Wellness Hospital (Sample)', 'Dermatology', 'Dr. Nandini Rajesh', 'MD', 'Dermatologist', 6, 'Mon-Wed 9:00 AM - 1:00 PM'),
    ('Chola Wellness Hospital (Sample)', 'Neurology', 'Dr. Kausalya Venkatesh', 'DM', 'Neurologist', 9, 'Mon-Fri 10:00 AM - 4:00 PM'),
    ('Chola Wellness Hospital (Sample)', 'Ophthalmology', 'Dr. Mahesh Ram', 'MS', 'Ophthalmologist', 8, 'Mon-Fri 10:00 AM - 5:00 PM'),
    ('Chola Wellness Hospital (Sample)', 'General Medicine', 'Dr. Devanand S', 'MD', 'General Physician', 12, 'Mon-Sat 9:00 AM - 6:00 PM'),
    ('Harbor Coast Medical Center (Sample)', 'Gynecology', 'Dr. Padmavathi Murugan', 'MD', 'Obstetrician-Gynecologist', 11, 'Mon-Thu 9:00 AM - 2:00 PM'),
    ('Harbor Coast Medical Center (Sample)', 'Pulmonology', 'Dr. Ashwin Kumar', 'MD', 'Pulmonologist', 8, 'Tue-Sat 9:00 AM - 3:00 PM'),
    ('Harbor Coast Medical Center (Sample)', 'Cardiology', 'Dr. Revathi Subash', 'DM', 'Cardiologist', 10, 'Mon-Fri 9:00 AM - 5:00 PM'),
    ('Harbor Coast Medical Center (Sample)', 'General Medicine', 'Dr. Ganesh Elangovan', 'MD', 'General Physician', 13, 'Mon-Sat 8:00 AM - 7:00 PM')
) AS v(hospital_name, dept_name, dr_name, dr_title, dr_specialty, dr_experience, dr_availability)
  ON v.hospital_name = h.name
 AND v.dept_name = d.name
ON CONFLICT (hospital_id, department_id, name) DO NOTHING;