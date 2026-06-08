INSERT INTO users (name, email, password_hash, role, phone, city, state)
VALUES
  ('Admin', 'Alexandre.duraes.soares@gmail.com', '$2b$10$troque-pelo-hash-de-Tecprime-123', 'admin', '(91) 99999-0000', 'Belem', 'PA'),
  ('Organizador Demo', 'organizador@chipbelem.com.br', '$2b$10$troque-este-hash-em-producao', 'organizer', '(91) 98888-0000', 'Belem', 'PA'),
  ('Atleta Demo', 'atleta@chipbelem.com.br', '$2b$10$troque-este-hash-em-producao', 'athlete', '(91) 97777-0000', 'Belem', 'PA')
ON CONFLICT (email) DO NOTHING;

INSERT INTO organizer_profiles (user_id, company_name, contact_name, contact_email, contact_phone)
SELECT id, 'ChipBelem Eventos', 'Organizador Demo', 'organizador@chipbelem.com.br', '(91) 98888-0000'
FROM users
WHERE email = 'organizador@chipbelem.com.br'
ON CONFLICT (user_id) DO NOTHING;
