import { Express } from 'express';
import { Server } from 'http';
import * as $supertest from 'supertest';
import { User } from '../../src/infra/auth/jwt-passport';
import { postInit, preInit } from './init-tests';
import { PineTest } from 'pinejs-client-supertest';

import { sbvrUtils } from '@balena/pinejs';

export type { PineTest };

export type UserObjectParam = Partial<User & { token: string }>;

export let app: Express;
export let server: Server;
export let version: string;
export let pineTest: PineTest;

export const initSupertest = async function () {
	await deInitSupertest();
	// delete require.cache[require.resolve('./../../init')];
	const init = require('./../../init');
	version = init.EXPOSED_API_VERSION;
	const defaultConfig = require('./../../config');
	// defaultConfig.models[0].migrationsPath = __dirname + '/fixtures/migrations';
	app = init.app;
	pineTest = new PineTest({ apiPrefix: `${version}/` }, { app });
	await preInit();
	server = await init.init(defaultConfig);
	await postInit();
	return server;
};

// TODO: Why calling this in after is not cleaning up before calling next before?
export const deInitSupertest = async function () {
	// TODO: flushing redis in deInitSupertest?
	if (server) {
		await new Promise(async (resolve) => {
			server?.close(() => {
				console.log(`server closed`);
				resolve(null);
			});
		});
		await deleteDatabase();
	}
};

export const supertest = function (user?: string | UserObjectParam) {
	// Can be an object with `token`, a JWT string or an API key string
	let token = user;
	if (typeof user === 'object' && user.token) {
		token = user.token;
	}
	// We have to cast `as any` because the types are poorly maintained
	// and don't support setting defaults
	const req: any = $supertest.agent(app);
	req.set('X-Forwarded-Proto', 'https');

	if (typeof token === 'string') {
		req.set('Authorization', `Bearer ${token}`);
	}
	return req as ReturnType<typeof $supertest.agent>;
};

const deleteDatabase = async (): Promise<void> => {
	await sbvrUtils.db.transaction(async (tx) =>
		tx.executeSql(
			`
DROP SCHEMA \"public\" CASCADE; CREATE SCHEMA \"public\";`,
		),
	);
};

before(async function () {
	await initSupertest();
});
