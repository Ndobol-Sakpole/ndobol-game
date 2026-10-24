PRAGMA foreign_keys = ON;
BEGIN;
INSERT OR IGNORE INTO players(id,display_name) VALUES ('local-player','Penjelajah Lokal');
INSERT OR IGNORE INTO items(id,name,category) VALUES (1,'Getek Bambu','getek'),(2,'Dayung Kayu','paddle'),(3,'Bebek Sungai','animal-skin');
COMMIT;
