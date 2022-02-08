DROP TABLE IF EXISTS "test";

CREATE TABLE IF NOT EXISTS "test" (
	"created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
,	"id" BIGINT NOT NULL PRIMARY KEY
,	"columnA" VARCHAR(255) NOT NULL UNIQUE
,	"columnB" VARCHAR(255) NOT NULL
,	"columnC" VARCHAR(255) NULL
);


INSERT INTO "test" ("id","columnA", "columnB", "columnC")
VALUES (1,'a001','b001',NULL), (2,'a002','b002', NULL), (3,'a003','b003', NULL), (4,'a004','b004', 'dummy');


