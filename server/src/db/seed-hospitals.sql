-- ============================================================================
-- SEED DATA — HOSPITALS, DEPARTMENTS, DOCTORS (EIGHT TAMIL NADU CITIES)
-- ----------------------------------------------------------------------------
-- Hospital rows below are real facilities in the eight locations the patient
-- app supports: Coimbatore, Chennai, Madurai, Tiruchirappalli, Tiruppur,
-- Salem, Erode and Pollachi. Addresses, phone numbers, emails and websites are
-- included only where verified from the facility's own listing or an official
-- district directory; anything unverified is NULL rather than invented.
--
-- Erode and Pollachi each also carry clearly labelled demo hospitals
-- ("... (Demo)"). Every doctor seeded here is synthetic demo data, marked both
-- in the name ("Dr. ... (Demo)") and with doctors.is_demo = true, so the admin
-- panel can distinguish it from records administrators enter themselves.
--
-- Applied by `npm run db:init` (default; pass --no-seed to skip) after
-- schema.sql. All statements run as one idempotent transaction: hospitals
-- upsert by (name, city) and only fill blank columns on conflict,
-- departments/doctors insert by natural key, and re-runs never clobber edits
-- made from the admin panel.
-- ============================================================================

-- Clean up legacy development rows so they cannot leak into recommendations.
DELETE FROM hospitals
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006'
)
  AND NOT EXISTS (SELECT 1 FROM appointments a WHERE a.hospital_id = hospitals.id);

-- Normalize an older admin row: it was entered under the neighbourhood name
-- and keeps an empty contact field instead of NULL.
UPDATE hospitals SET city = 'Coimbatore', district = 'Coimbatore'
WHERE upper(name) = 'SHANTHI SOCIAL SERVICE' AND upper(city) = 'SINGANALLUR';

UPDATE hospitals SET email = NULLIF(email, ''), website = NULLIF(website, '')
WHERE email = '' OR website = '';

-- Fix a department typo, guarded so it cannot collide with the corrected name.
UPDATE hospital_departments SET name = 'Pulmonology'
WHERE lower(name) = 'pulmunology'
  AND NOT EXISTS (
    SELECT 1 FROM hospital_departments x
    WHERE x.hospital_id = hospital_departments.hospital_id
      AND x.name = 'Pulmonology'
  );

-- ----------------------------------------------------------------------------
-- Staging table: the single source of truth for everything below. Temp table
-- keeps the 100-row dataset in one place while hospitals, departments and
-- doctors are all upserted from it, and disappears when this file's implicit
-- transaction commits.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS seed_hospitals;
CREATE TEMP TABLE seed_hospitals (
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  hospital_type TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  PRIMARY KEY (name, city)
) ON COMMIT DROP;

INSERT INTO seed_hospitals (name, city, hospital_type, address, phone, email, website) VALUES
  -- ------------------------------ Coimbatore (14) ---------------------------
  ('Ganga Hospital', 'Coimbatore', 'Multispeciality Hospital', '313, Mettupalayam Road, Saibaba Colony, Coimbatore 641043', '04222485000', NULL, 'https://www.gangahospital.com'),
  ('GEM Hospital', 'Coimbatore', 'Gastro Sciences Hospital', '45, Pankaja Mills Road, Ramanathapuram, Coimbatore 641045', '04224695100', NULL, NULL),
  ('KG Hospital', 'Coimbatore', 'Multispeciality Hospital', '5, Government Arts College Road, Gopalapuram, Coimbatore 641018', '04224042121', NULL, NULL),
  ('Kovai Medical Center & Hospital', 'Coimbatore', 'Multispeciality Hospital', '99, Avinashi Road, Coimbatore 641014', '04224324433', 'getwell@kmchhospitals.com', 'https://kmchhospitals.com'),
  ('PSG Hospitals', 'Coimbatore', 'Teaching Hospital', 'Avinashi Road, Peelamedu, Coimbatore 641004', '04224345353', NULL, NULL),
  ('Sri Ramakrishna Hospital', 'Coimbatore', 'Multispeciality Hospital', '395, Sarojini Naidu Road, Siddhapudur, Coimbatore 641044', '04224500000', NULL, NULL),
  ('SHANTHI SOCIAL SERVICE', 'Coimbatore', 'Multispeciality Hospital', 'Ondipudur, Coimbatore 641016', '04222205500', NULL, NULL),
  ('Coimbatore Medical College Hospital', 'Coimbatore', 'Government Medical College Hospital', 'Trichy Road, Ramanathapuram, Coimbatore 641018', '0422-2301393', NULL, NULL),
  ('Government ESI Medical College and Hospital', 'Coimbatore', 'Government Medical College Hospital', '58, Kamarajar Road, Singanallur, Coimbatore 641015', '0422-2574391', NULL, NULL),
  ('Royal Care Super Speciality Hospital', 'Coimbatore', 'Super Speciality Hospital', '372F, Dr. Nanjappaa Road, Ramanathapuram, Coimbatore 641018', '0422-4001000', 'contact@royalcarehospitals.in', 'https://royalcarehospital.in'),
  ('The Eye Foundation', 'Coimbatore', 'Eye Hospital', '582A, D.B. Road, R.S. Puram, Coimbatore 641002', NULL, NULL, NULL),
  ('Deepam Hospital', 'Coimbatore', 'Multispeciality Hospital', '687, Trichy Road, Coimbatore 641045', NULL, NULL, NULL),
  ('Ashwin Hospitals', 'Coimbatore', 'Multispeciality Hospital', '1, Alamu Nagar, Coimbatore 641012', NULL, NULL, NULL),
  ('V.G. Hospital', 'Coimbatore', 'Multispeciality Hospital', '76-A, M.T.P. Road, Coimbatore 641034', NULL, NULL, NULL),
  -- ------------------------------ Chennai (18) ------------------------------
  ('Government General Hospital, Chennai', 'Chennai', 'Government General Hospital', 'Poonamallee High Road, Park Town, Chennai 600003', '044-25305000', NULL, NULL),
  ('Government Kilpauk Medical College Hospital', 'Chennai', 'Government Medical College Hospital', '822, Poonamallee High Road, Kilpauk, Chennai 600010', '044-28364951', NULL, NULL),
  ('Government Multi Super Speciality Hospital, Omandurar', 'Chennai', 'Government Super Speciality Hospital', 'Wallahjah Road, Anna Salai, Omandurar Government Estate, Chennai 600002', '044-25666000', NULL, NULL),
  ('Government Stanley Medical College Hospital', 'Chennai', 'Government Medical College Hospital', '305, Osh Road, Old Washermanpet, Chennai 600001', NULL, NULL, NULL),
  ('Government Ophthalmic Hospital, Chennai', 'Chennai', 'Eye Hospital', '132, Rukmani Lakshmipathy Salai, Egmore, Chennai 600008', NULL, NULL, NULL),
  ('Government Tuberculosis Hospital, Otteri', 'Chennai', 'Chest Hospital', 'Ayanavaram Road, Otteri, Chennai 600023', NULL, NULL, NULL),
  ('Government Peripheral Hospital, Anna Nagar', 'Chennai', 'Government General Hospital', '3rd Avenue, Annai Sathya Nagar, Anna Nagar, Chennai 600102', NULL, NULL, NULL),
  ('Government Royapettah Hospital', 'Chennai', 'Government General Hospital', 'Westcott Road, Royapettah, Chennai 600014', NULL, NULL, NULL),
  ('Government Institute of Obstetrics and Gynaecology, Egmore', 'Chennai', 'Maternity & Gynecology Hospital', 'Halls Road, Egmore, Chennai 600008', NULL, NULL, NULL),
  ('Apollo Hospitals, Greams Road', 'Chennai', 'Multispeciality Hospital', '21, Greams Lane, Thousand Lights, Chennai 600006', '044-28290200', NULL, 'https://www.apollohospitals.com'),
  ('Apollo Speciality Hospital, Teynampet', 'Chennai', 'Multispeciality Hospital', '36, TTK Road, Chennai 600018', '044-24331740', NULL, 'https://www.apollohospitals.com'),
  ('Billroth Hospitals', 'Chennai', 'Multispeciality Hospital', '43, Lakshmi Talkies Road, Shenoy Nagar, Chennai 600030', '044-26641777', NULL, NULL),
  ('C.S.I. Kalyani Hospital', 'Chennai', 'Multispeciality Hospital', '15, Dr. Radhakrishnan Salai, Mylapore, Chennai 600004', '044-28476433', NULL, NULL),
  ('Dr. Mehta''s Hospital', 'Chennai', 'Multispeciality Hospital', '2, McNichols Road, Chetpet, Chennai 600031', '044-42271001', NULL, NULL),
  ('Fortis Malar Hospital', 'Chennai', 'Multispeciality Hospital', '52, 1st Main Road, Gandhi Nagar, Adyar, Chennai 600020', '044-42892222', NULL, NULL),
  ('Cancer Institute (WIA), Adyar', 'Chennai', 'Cancer Centre', 'Dr. Sardar Patel Road, Adyar, Chennai 600020', '044-22350131', NULL, NULL),
  ('Sri Ramachandra Medical College and Hospital', 'Chennai', 'Teaching Hospital', '1, Bharathi Salai, Porur, Chennai 600116', NULL, NULL, NULL),
  ('MIOT International Hospital', 'Chennai', 'Multispeciality Hospital', '4/127, Manapakkam, Mount Poonamallee Road, Chennai 600089', NULL, NULL, NULL),
  -- ------------------------------ Madurai (13) ------------------------------
  ('Government Rajaji Hospital', 'Madurai', 'Government Medical College Hospital', 'Panagal Road, Alwarpuram, Madurai 625020', '0452-2533230', 'deanmdu@gmail.com', NULL),
  ('Government Hospital, Balarengapuram', 'Madurai', 'Government General Hospital', 'BB Road, Balarengapuram, Madurai 625009', '0452-2337902', 'ghbala09@gmail.com', NULL),
  ('Government Hospital, Thoppur', 'Madurai', 'District Government Hospital', 'Thoppur, Madurai 625008', '0452-2482339', NULL, NULL),
  ('Aravind Eye Hospital, Madurai', 'Madurai', 'Eye Hospital', '1, Anna Nagar, Madurai 625020', '0452-4356100', NULL, 'https://www.aravind.org'),
  ('Apollo Speciality Hospital, Madurai', 'Madurai', 'Multispeciality Hospital', 'Lake View Road, K.K. Nagar, Madurai 625020', '0452-2580893', NULL, 'https://www.apollohospitals.com'),
  ('Saravana Multispeciality Hospital', 'Madurai', 'Multispeciality Hospital', '7A, Maruthupandiyar Nagar, Narimedu, Madurai 625002', '0452-2446000', 'shmc.1992@gmail.com', 'https://saravanahospital.org'),
  ('Arthur Asirvatham Hospital', 'Madurai', 'Multispeciality Hospital', '42A, Anna Bus Stand, Madurai 625020', '0452-4392237', NULL, 'https://arthurasirvathamhospital.org'),
  ('A.R. Hospital', 'Madurai', 'Multispeciality Hospital', '609, K.K. Nagar, Madurai 625020', '0452-2586630', NULL, NULL),
  ('J.K. Hospital', 'Madurai', 'Multispeciality Hospital', '190, 4th Street, Alagar Nagar, K.Pudur, Madurai 625007', '0452-2565899', NULL, NULL),
  ('Hannah Joseph Hospital', 'Madurai', 'Multispeciality Hospital', 'Madurai-Tuticorin Ring Road, Chinthamani, Madurai 625009', '0452-3505151', 'hjhospital.management@gmail.com', 'https://hannahjosephhospital.com'),
  ('Guru Hospital', 'Madurai', 'Multispeciality Hospital', '4/120-F, Pandikovil Ring Road, Mattuthavani, Madurai 625107', NULL, 'info@guruhospitals.com', 'https://guruhospitals.com'),
  ('Shenbagam Hospital', 'Madurai', 'Multispeciality Hospital', '15, 16, North Cross 3rd Street, Anna Nagar, Sathamangalam, Madurai 625020', '0452-4283333', 'shenhosp7@gmail.com', 'https://shenbagamhospital.org'),
  ('Vadamalayan Hospital', 'Madurai', 'Multispeciality Hospital', '15/1, Jawahar Road, Chokkikulam, Madurai 625002', '0452-3545400', 'enquiries@vadamalayan.org', 'https://www.vadamalayan.org'),
  -- ------------------------ Tiruchirappalli (13) ----------------------------
  ('Annal Gandhi Memorial Government Hospital', 'Tiruchirappalli', 'Government Medical College Hospital', 'Bharthi Nagar, Puthur, Tiruchirappalli 620017', '0431-2771465', NULL, NULL),
  ('Government Hospital, Srirangam', 'Tiruchirappalli', 'District Government Hospital', 'Gandhi Road, Srirangam, Tiruchirappalli 620006', '0431-2432227', NULL, NULL),
  ('Kauvery Hospital, Tennur', 'Tiruchirappalli', 'Multispeciality Hospital', 'No. 1, K.C. Road, Tennur, Tiruchirappalli 620017', '0431-4022555', NULL, 'https://www.kauveryhospital.com'),
  ('Kauvery Hospital, Cantonment', 'Tiruchirappalli', 'Multispeciality Hospital', 'No. 6, Royal Road, Cantonment, Tiruchirappalli 620001', '0431-4077777', NULL, 'https://www.kauveryhospital.com'),
  ('Kauvery Heart City', 'Tiruchirappalli', 'Cardiac Hospital', 'No. 52, Alexandria Road, Cantonment, Tiruchirappalli 620001', '0431-4077777', NULL, 'https://www.kauveryhospital.com'),
  ('Apollo Speciality Hospital, Tiruchirappalli', 'Tiruchirappalli', 'Multispeciality Hospital', 'Chennai Bypass Road, Ariyamangalam, Tiruchirappalli 620008', '0431-6607777', 'frontoffice_trichy@apollohospitals.com', 'https://www.apollohospitals.com'),
  ('HCG Cancer Centre, Tiruchirappalli', 'Tiruchirappalli', 'Cancer Centre', 'No. 1, K.C. Road, Tennur, Tiruchirappalli 620017', NULL, NULL, NULL),
  ('Tiruchy Medical Center and Hospitals', 'Tiruchirappalli', 'Multispeciality Hospital', 'B-17, 11th Cross Road, West Thillai Nagar, Tiruchirappalli 620018', '0431-2741919', NULL, NULL),
  ('Mahathma Eye Hospital', 'Tiruchirappalli', 'Eye Hospital', 'No. 6, Seshapuram, Tennur, Tiruchirappalli 620017', NULL, NULL, NULL),
  ('Gitanjali Medical Centre', 'Tiruchirappalli', 'Multispeciality Hospital', 'Bishop Heber College, Vayaloor Road, Tiruchirappalli 620017', NULL, NULL, NULL),
  ('Vasan Eye Care, Tiruchirappalli', 'Tiruchirappalli', 'Eye Hospital', '10, Annamalai Nagar, Thillai Nagar, Tiruchirappalli 620018', NULL, NULL, NULL),
  ('Olympia Hospital', 'Tiruchirappalli', 'Multispeciality Hospital', '47/A, Puthur High Road, Tiruchirappalli 620017', NULL, NULL, NULL),
  ('Maruti Hospital', 'Tiruchirappalli', 'Nursing Home', '95, Pattabiraman Street, Tiruchirappalli 620017', NULL, NULL, NULL),
  -- ------------------------------ Tiruppur (12) -----------------------------
  ('Government Headquarters Hospital, Tiruppur', 'Tiruppur', 'District Government Hospital', 'Tiruppur 641604', '0421-2422201', NULL, NULL),
  ('Aravind Eye Hospital, Tiruppur', 'Tiruppur', 'Eye Hospital', 'Dharapuram Main Road, K. Chettipalayam, Tiruppur 641608', NULL, NULL, 'https://www.aravind.org'),
  ('The Eye Foundation', 'Tiruppur', 'Eye Hospital', '209, Harvey Road, Tiruppur', NULL, NULL, NULL),
  ('Kitchappan Hospital', 'Tiruppur', 'Multispeciality Hospital', '384, P.N. Road, Tiruppur 641602', '0421-2242466', NULL, NULL),
  ('Krithika Hospital', 'Tiruppur', 'Multispeciality Hospital', '15, Karuvam Palayam, Mangalam Road, Tiruppur 641604', '0421-2246465', NULL, NULL),
  ('M.P.S. Gastro Care and Endoscopy Centre', 'Tiruppur', 'Gastro Sciences Hospital', '165, Avinashi Road, Kumar Nagar, Tiruppur 641603', NULL, NULL, NULL),
  ('Velan Hospital', 'Tiruppur', 'Multispeciality Hospital', 'Avinasi Road, Anupparpalayam Pudhur, Tiruppur 641602', NULL, NULL, NULL),
  ('Aiswarya Hospital', 'Tiruppur', 'Multispeciality Hospital', 'Gandhi Road, Anupparpalayam Pudhur, Tiruppur 641602', NULL, NULL, NULL),
  ('B.M. Ortho Hospital', 'Tiruppur', 'Orthopedic Hospital', 'Periyar Colony, Anupparpalayam Pudhur, Tiruppur 641602', NULL, NULL, NULL),
  ('Tiruppur Chest Hospital', 'Tiruppur', 'Chest Hospital', '60 Feet Road, Kumar Nagar, Tiruppur 641603', NULL, NULL, NULL),
  ('OMS Hospital', 'Tiruppur', 'Multispeciality Hospital', 'Palladam Road, Veerapandi Pirivu, Tiruppur 641604', NULL, NULL, NULL),
  ('Maragatham Hospital', 'Tiruppur', 'Multispeciality Hospital', 'Annapoorna Layout Road, Angeripalayam, Tiruppur 641602', NULL, NULL, NULL),
  -- -------------------------------- Salem (13) ------------------------------
  ('Government Mohan Kumaramangalam Medical College Hospital', 'Salem', 'Government Medical College Hospital', 'Steel Plant Road, Kollapatti, Salem 636030', '0427-2210563', 'msgmkmchsalem@gmail.com', NULL),
  ('Aravind Eye Hospital, Salem', 'Salem', 'Eye Hospital', '65/1A and 65/1B, Salem-Coimbatore Highway, Uthamacholapuram, Veerapandi, Salem 636010', '0427-2356100', 'salem.patientcare@aravind.org', 'https://www.aravind.org'),
  ('Sri Ramachandra Medical College Hospital, Chellum', 'Salem', 'Multispeciality Hospital', '31/3C, Vijaya Raghavachary Road, Gandhi Road, Salem 636007', '0427-2319395', NULL, NULL),
  ('Shanmuga Hospital and Salem Cancer Institute', 'Salem', 'Cancer Centre', '24, Sarada College Road, Salem 636007', '0427-2332337', NULL, NULL),
  ('S.K.S. Hospital', 'Salem', 'Multispeciality Hospital', 'Sarada College Road, Salem 636007', '0427-4033333', 'web@sksh.ac.in', 'https://www.skshospital.org'),
  ('Salem Polyclinic', 'Salem', 'Nursing Home', '266/128, Omalur Road, Salem 636007', NULL, NULL, NULL),
  ('Sri Vasantham Hospital', 'Salem', 'Multispeciality Hospital', '52/1, Sangagiri Main Road, Opposite D.S.P. Office, Salem 636006', NULL, NULL, NULL),
  ('T.V.G. Hospital', 'Salem', 'Multispeciality Hospital', '181, Trichy Main Road, Gugai, Salem 636006', NULL, NULL, NULL),
  ('S.P.M.M. Hospital', 'Salem', 'Multispeciality Hospital', 'Ammapet, Salem 636003', NULL, NULL, NULL),
  ('Bhavani Hospital', 'Salem', 'Multispeciality Hospital', '65, Ragavan Street, Swarnapuri, Salem 636004', NULL, NULL, NULL),
  ('Universal Cancer Hospital', 'Salem', 'Cancer Centre', '370, Nadu Street, Jari Kondalampatti, Salem', NULL, NULL, NULL),
  ('Manipal Hospital, Salem', 'Salem', 'Multispeciality Hospital', 'Dalmia Road, Salem 636002', NULL, NULL, NULL),
  ('Kauvery Hospital, Salem', 'Salem', 'Multispeciality Hospital', 'Seelanaickenpatti, Salem', NULL, NULL, 'https://www.kauveryhospital.com'),
  -- -------------------------------- Erode (10) ------------------------------
  ('Government Headquarters Hospital, Erode', 'Erode', 'District Government Hospital', 'E.V.N. Road, Erode 638009', '0424-2253676', NULL, NULL),
  ('KMCH Speciality Hospital', 'Erode', 'Multispeciality Hospital', '16, Palaniappa Street, Erode 638009', '0424-2256456', 'getwell@kmchhospitals.com', 'https://kmchhospitals.com'),
  ('Abitha Hospital', 'Erode', 'Maternity & Gynecology Hospital', '23, Brough Road, Erode 638001', '0424-2255961', NULL, NULL),
  ('Anusha Hospital', 'Erode', 'Maternity & Gynecology Hospital', 'E.V.N. Road, Erode 638009', '0424-2260890', NULL, NULL),
  ('AdhiSathya Hospital', 'Erode', 'Multispeciality Hospital', 'Perundurai Road, Erode', '0424-2269518', NULL, NULL),
  ('V.C. Hospital', 'Erode', 'Multispeciality Hospital', 'E.V.N. Road, Erode 638009', '0424-2255404', NULL, NULL),
  ('V.K. Hospital', 'Erode', 'Maternity & Gynecology Hospital', 'Krishnampalayam Road, Erode', '0424-2212666', NULL, NULL),
  ('Jai Maaruthi Hospital', 'Erode', 'Multispeciality Hospital', '146/1, Gandhi Road, Erode 638001', NULL, NULL, NULL),
  ('Kongu Care Multispeciality Hospital (Demo)', 'Erode', 'Multispeciality Hospital', 'Sathy Main Road, Erode 638001', NULL, NULL, NULL),
  ('Erode Children & Women Hospital (Demo)', 'Erode', 'Maternity & Gynecology Hospital', 'Gandhi Road, Erode 638001', NULL, NULL, NULL),
  ------------------------------- Pollachi (7) -------------------------------
  ('Government Hospital, Pollachi', 'Pollachi', 'Government General Hospital', 'Udumalai Pettai Road, Pollachi 642001', '04259-229322', NULL, NULL),
  ('Pills Hospital', 'Pollachi', 'Multispeciality Hospital', '70/53, Bharathi Road, Mahalingapuram, Pollachi 642002', '04259-235757', 'pillshospital@gmail.com', 'https://www.pillshospital.com'),
  ('Kausalya Medical Centre', 'Pollachi', 'Multispeciality Hospital', '96, New Scheme Road, Pollachi 642002', '04259-296959', 'kausalyamedicalcentre@gmail.com', 'https://kmchospitalpollachi.com'),
  ('Arathana Hospital', 'Pollachi', 'Orthopedic Hospital', '120-C, Coimbatore Road, Pollachi 642002', '04259-226039', 'arathanaortho@gmail.com', 'https://www.arathanahospital.com'),
  ('Arun Hospital', 'Pollachi', 'Multispeciality Hospital', '49/84, New Scheme Road, Pollachi 642002', NULL, NULL, NULL),
  ('Pollachi City Care Hospital (Demo)', 'Pollachi', 'Multispeciality Hospital', 'Bharathi Road, Pollachi 642002', NULL, NULL, NULL),
  ('Pollachi Women & Children Hospital (Demo)', 'Pollachi', 'Maternity & Gynecology Hospital', 'Coimbatore Road, Pollachi 642002', NULL, NULL, NULL);

-- Upsert into the real table. Availability is derived from the hospital type
-- (government outpatient hours, clinic hours, or standard private hours).
INSERT INTO hospitals (name, city, district, state, address, phone, email, website, availability, hospital_type)
SELECT
  s.name,
  s.city,
  s.city,
  'Tamil Nadu',
  s.address,
  s.phone,
  s.email,
  s.website,
  CASE
    WHEN s.hospital_type IN (
      'Government Medical College Hospital', 'Government General Hospital',
      'Government Super Speciality Hospital', 'District Government Hospital',
      'Teaching Hospital'
    ) THEN 'OPD: Mon-Sat 8:00 AM - 12:00 PM and 2:00 PM - 5:00 PM. Emergency: 24x7.'
    WHEN s.hospital_type IN ('Eye Hospital', 'Dental Hospital', 'Dermatology Clinic')
      THEN 'Mon-Sat 9:00 AM - 5:00 PM. Closed on Sundays.'
    ELSE 'Mon-Sat 9:00 AM - 7:00 PM. Emergency: 24x7.'
  END,
  s.hospital_type
FROM seed_hospitals s
ON CONFLICT (name, city) DO UPDATE SET
  -- Only fill blanks: anything an administrator typed in the admin panel wins.
  district = COALESCE(NULLIF(hospitals.district, ''), EXCLUDED.district),
  address = COALESCE(NULLIF(hospitals.address, ''), EXCLUDED.address),
  phone = COALESCE(NULLIF(hospitals.phone, ''), EXCLUDED.phone),
  email = COALESCE(NULLIF(hospitals.email, ''), EXCLUDED.email),
  website = COALESCE(NULLIF(hospitals.website, ''), EXCLUDED.website),
  availability = COALESCE(NULLIF(hospitals.availability, ''), EXCLUDED.availability),
  hospital_type = COALESCE(hospitals.hospital_type, EXCLUDED.hospital_type);

-- ----------------------------------------------------------------------------
-- Departments: the exact department set implied by each hospital's type, so a
-- recommended specialty always has somewhere to book. Multispeciality,
-- super-speciality and government facilities carry all 18 departments; smaller
-- facilities carry the focused set below.
-- ----------------------------------------------------------------------------
INSERT INTO hospital_departments (hospital_id, name, description)
SELECT h.id, dept.name, dd.description
FROM seed_hospitals s
JOIN hospitals h ON h.name = s.name AND h.city = s.city
CROSS JOIN LATERAL unnest(
  CASE s.hospital_type
    WHEN 'Eye Hospital' THEN ARRAY['Ophthalmology', 'ENT', 'General Medicine', 'Dermatology']
    WHEN 'Cardiac Hospital' THEN ARRAY['Cardiology', 'General Medicine', 'General Surgery', 'Endocrinology', 'Pulmonology']
    WHEN 'Cancer Centre' THEN ARRAY['Oncology', 'General Medicine', 'General Surgery', 'Pulmonology', 'Gastroenterology', 'Nephrology']
    WHEN 'Dental Hospital' THEN ARRAY['Dental', 'General Medicine']
    WHEN 'Orthopedic Hospital' THEN ARRAY['Orthopedics', 'General Medicine', 'General Surgery', 'Neurology']
    WHEN 'Gastro Sciences Hospital' THEN ARRAY['Gastroenterology', 'General Medicine', 'General Surgery', 'Endocrinology']
    WHEN 'Maternity & Gynecology Hospital' THEN ARRAY['Gynecology', 'Pediatrics', 'General Medicine']
    WHEN 'Psychiatric Hospital' THEN ARRAY['Psychiatry', 'General Medicine']
    WHEN 'Chest Hospital' THEN ARRAY['Pulmonology', 'General Medicine', 'General Surgery', 'Cardiology']
    WHEN 'Nursing Home' THEN ARRAY['General Medicine', 'General Surgery', 'Gynecology', 'Pediatrics', 'Orthopedics']
    WHEN 'Children''s Hospital' THEN ARRAY['Pediatrics', 'General Medicine', 'ENT', 'Dermatology', 'Ophthalmology']
    ELSE ARRAY[
      'General Medicine', 'Cardiology', 'Pulmonology', 'Neurology', 'Orthopedics',
      'Dermatology', 'Gastroenterology', 'Nephrology', 'Urology', 'ENT',
      'Ophthalmology', 'Pediatrics', 'Gynecology', 'Oncology', 'Psychiatry',
      'General Surgery', 'Endocrinology', 'Dental'
    ]
  END
) AS dept(name)
JOIN (VALUES
  ('General Medicine', 'First-line general and internal medicine consultations'),
  ('Cardiology', 'Heart and cardiovascular care'),
  ('Pulmonology', 'Lungs, airways and respiratory conditions'),
  ('Neurology', 'Nervous system, brain and nerve disorders'),
  ('Orthopedics', 'Bones, joints, muscles and spine'),
  ('Dermatology', 'Skin, hair and nail conditions'),
  ('Gastroenterology', 'Digestive system, liver and stomach conditions'),
  ('Nephrology', 'Kidney function, dialysis and renal care'),
  ('Urology', 'Urinary tract and male reproductive health'),
  ('ENT', 'Ear, nose and throat conditions'),
  ('Ophthalmology', 'Eye and vision care'),
  ('Pediatrics', 'Child health, growth and development'),
  ('Gynecology', 'Women''s reproductive health'),
  ('Oncology', 'Cancer diagnosis, treatment and supportive care'),
  ('Psychiatry', 'Mental health and emotional wellbeing'),
  ('General Surgery', 'Surgical evaluation and operative care'),
  ('Endocrinology', 'Hormones, diabetes and metabolic conditions'),
  ('Dental', 'Oral health, teeth and dental procedures')
) AS dd(name, description) ON dd.name = dept.name
ON CONFLICT (hospital_id, name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Doctors: one clearly-labelled demo doctor per seeded department. Names,
-- experience and shifts are derived deterministically from md5 hashes of the
-- hospital and department names, so re-running the seed produces the same
-- doctors and the natural-key conflict target simply skips them.
-- ----------------------------------------------------------------------------
WITH params AS (
  SELECT
    ARRAY[
      'Arun', 'Priya', 'Karthik', 'Divya', 'Rajesh', 'Lakshmi', 'Senthil', 'Meena',
      'Vijay', 'Anitha', 'Prakash', 'Kavitha', 'Mohan', 'Saranya', 'Ramesh', 'Deepa',
      'Balaji', 'Nithya', 'Hari', 'Gayathri', 'Suresh', 'Bhavani', 'Ashwin', 'Poornima',
      'Manoj', 'Keerthi', 'Sivakumar', 'Anbu', 'Gopal', 'Shobana', 'Vignesh', 'Ramya',
      'Naveen', 'Swetha', 'Prabhu', 'Malathi', 'Dinesh', 'Rekha', 'Anand', 'Uma'
    ]::text[] AS first_names,
    ARRAY[
      'Raman', 'Iyer', 'Murugesan', 'Subramani', 'Nair', 'Pandian', 'Venkataraman', 'Raghavan',
      'Sridhar', 'Das', 'Begum', 'Kumar', 'Anand', 'Krishnan', 'Mohan', 'Sankar',
      'Babu', 'Ramanan', 'Ali', 'Thomas', 'Selvam', 'Maheshwari', 'Kumaran', 'Manohar',
      'Devi', 'Rao', 'Sivakumar', 'Perumal', 'Murthy', 'Rajesh', 'Venkatesh', 'Ram',
      'Elangovan', 'Murugan', 'Subash', 'Chandran', 'Palani', 'Ganesan', 'Sundaram', 'Jayaraman'
    ]::text[] AS last_names,
    ARRAY[
      'Mon-Fri 9:00 AM - 1:00 PM',
      'Tue-Sat 10:00 AM - 2:00 PM',
      'Mon, Wed, Fri 9:00 AM - 5:00 PM',
      'Mon-Sat 4:00 PM - 8:00 PM'
    ]::text[] AS slots
),
dept_meta(name, title, specialty) AS (
  VALUES
    ('General Medicine', 'MBBS, MD', 'General Physician'),
    ('Cardiology', 'MD, DM', 'Cardiologist'),
    ('Pulmonology', 'MD, DM', 'Pulmonologist'),
    ('Neurology', 'MD, DM', 'Neurologist'),
    ('Orthopedics', 'MS', 'Orthopedic Surgeon'),
    ('Dermatology', 'MD', 'Dermatologist'),
    ('Gastroenterology', 'MD, DM', 'Gastroenterologist'),
    ('Nephrology', 'MD, DM', 'Nephrologist'),
    ('Urology', 'MS, MCh', 'Urologist'),
    ('ENT', 'MS', 'ENT Specialist'),
    ('Ophthalmology', 'MS', 'Ophthalmologist'),
    ('Pediatrics', 'MD', 'Pediatrician'),
    ('Gynecology', 'MS (OBG)', 'Obstetrician-Gynecologist'),
    ('Oncology', 'MD, DM', 'Medical Oncologist'),
    ('Psychiatry', 'MD', 'Psychiatrist'),
    ('General Surgery', 'MS', 'General Surgeon'),
    ('Endocrinology', 'MD, DM', 'Endocrinologist'),
    ('Dental', 'BDS, MDS', 'Dentist')
)
INSERT INTO doctors (hospital_id, department_id, name, title, specialty, experience, availability, is_demo)
SELECT
  h.id,
  d.id,
  'Dr. ' || p.first_names[1 + (get_byte(x.b, 0) % 40)]
        || ' ' || p.last_names[1 + (get_byte(x.b, 1) % 40)]
        || ' (Demo)',
  m.title,
  m.specialty,
  4 + (get_byte(x.b, 3) % 17),
  p.slots[1 + (get_byte(x.b, 4) % 4)],
  true
FROM seed_hospitals s
JOIN hospitals h ON h.name = s.name AND h.city = s.city
JOIN hospital_departments d ON d.hospital_id = h.id
JOIN dept_meta m ON m.name = d.name
CROSS JOIN params p
CROSS JOIN LATERAL (SELECT decode(md5(h.name || '|' || d.name), 'hex') AS b) x
ON CONFLICT (hospital_id, department_id, name) DO NOTHING;

-- Pre-existing doctor rows were also invented for development; mark them demo
-- so the admin panel can tell them apart. NULL only — never overwrites an
-- explicit false written by the admin panel.
UPDATE doctors SET is_demo = true WHERE is_demo IS NULL;
