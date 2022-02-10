import { initSupertest } from './test-lib/supertest';
import * as _ from 'lodash';
import { sbvrUtils, dbModule } from '@balena/pinejs';
import { expect } from 'chai';
import * as fs from 'fs';
import { setTimeout as delay } from 'timers/promises';

describe('Async Migrations', async function () {
	this.timeout(60000);

	describe('data catch up', function () {
		beforeEach(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/01-migrations/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });

			// manually calling the init data creation sql query as the model gets
			// executed for the first time and sync migrations are skipped
			const initDataSql = await fs.promises.readFile(
				__dirname +
					'/fixtures/19-async-migrator/01-migrations/0001-init-data.sync.sql',
				'utf8',
			);

			await sbvrUtils.db.transaction(async (tx) => {
				await tx.executeSql(initDataSql);
			});
		});

		it('wait for migrators run', async function () {
			await delay(3000); // wait for some migrations to have happened
			let result: dbModule.Result = {} as dbModule.Result;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(
					`	SELECT * FROM test
						WHERE  "columnA" = "columnC";`,
				);
			});
			expect(result?.rows).to.be.not.empty;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(`SELECT * FROM "migration status";`);
			});
			expect(result?.rows).to.be.not.empty;
		});
	});

	// TODO Async migrator in background is not killed with initSupertest

	describe('async migration skip', function () {
		beforeEach(async function () {
			const testConfig = require('../config');

			testConfig.models[0].migrationsPath =
				__dirname + '/fixtures/19-async-migrator/02-skip-async/';

			// delete cached migrations
			testConfig.models[0].migrations = {};
			await initSupertest({ initConfig: testConfig, deleteDatabase: true });

			// manually calling the init data creation sql query as the model gets
			// executed for the first time and sync migrations are skipped
			const initDataSql = await fs.promises.readFile(
				__dirname +
					'/fixtures/19-async-migrator/02-skip-async/0001-init-data.sync.sql',
				'utf8',
			);

			await sbvrUtils.db.transaction(async (tx) => {
				await tx.executeSql(initDataSql);
			});
		});

		it('no async row migration should take place', async function () {
			await delay(2000); // wait for some migrations to have happened
			let result: dbModule.Result = {} as dbModule.Result;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(
					`	SELECT * FROM test
						WHERE  "columnA" = "columnC";`,
				);
			});
			expect(result?.rows).to.be.empty;

			await sbvrUtils.db.transaction(async (tx) => {
				result = await tx.executeSql(`SELECT * FROM "migration status";`);
			});
			expect(result?.rows).to.be.empty;
		});
	});
});

// TODO: Testcase parallel migration
// TODO: Testcase forever migration (multiple catch ups)
// TODO: Parallel Error / Success migration

// TODO: TableLock test?
