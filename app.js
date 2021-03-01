// Load required modules
require('dotenv').config();

const http = require('http');
const https = require('https');

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

const createError = require('http-errors');
const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const config = require('@big_store_core/base/config');
const status_message = require('@big_store_core/base/enums/status_message');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

process.env.TZ = config.date.timezone || process.env.TZ;

const app = express();

const authorization = require('@big_store_core/api/libraries/middlewares/authorization');
const analytics = require('@big_store_core/base/middlewares/analytics');
const app_version = require('@big_store_core/api/libraries/middlewares/app_version');
const cache = require('@big_store_core/base/middlewares/cache');
const database = require('@big_store_core/base/middlewares/database');
const filter = require('@big_store_core/base/middlewares/filter');
const i18n = require('@big_store_core/base/middlewares/i18n');
const initialize = require('@big_store_core/base/middlewares/initialize');
const pagination = require('@big_store_core/base/middlewares/pagination');
const response = require('@big_store_core/base/middlewares/response');
const settings = require('@big_store_core/base/middlewares/settings');
const sorting = require('@big_store_core/base/middlewares/sorting');
const validation = require('@big_store_core/base/middlewares/validation');

app.use(initialize(__dirname));
app.use(response);
app.use(i18n(path.resolve('i18n')));
app.use(app_version);
app.use(database);
app.use(cache);
app.use(authorization);
app.use(settings);
app.use(analytics);
app.use(filter);
app.use(sorting);
app.use(pagination);
app.use(validation);

app.use(logger('dev'));
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({
	extended: false
}));
app.use(cookieParser());

const cors = require('cors')
const corsOptions = {
	origin: config.origin,
	optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

const all_modules = fs.readdirSync(path.join(__dirname, `modules`));
for (const moduleName of all_modules) {
	// api
	const moduleRouter = require(`./modules/${moduleName}/route`);
	app.use(`/v1/${moduleName}`, moduleRouter);
}

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	console.log('=====================Start of Error====================');
	console.log('=========================================');
	console.log('--------[DateTime]------', '::', new Date());
	console.log('--------[Protocol]------', '::', req.protocol);
	console.log('--------[Hostname]------', '::', req.hostname);
	console.log('--------[OriginalUrl]---', '::', req.originalUrl);
	console.log('--------[IP]------------', '::', req.ip);
	console.log('--------[Method]--------', '::', req.method);
	console.log('--------[Params]--------', '::', req.params);
	console.log('--------[User-Agent]----', '::', req.get('User-Agent'));
	console.log('--------[User-IP]-------', '::', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
	console.log('--------[Query]---------', '::', req.query);
	console.log('--------[Body]----------', '::', req.body);
	console.log('--------------[Error Details]--------------');
	console.log(err);
	console.log('--------------[End Error Details]--------------');
	console.log('=========================================');
	console.log('=====================End of Error====================');

	// render the error page
	res.out({
		errors: 'Error!',
	}, status_message.UNEXPECTED_ERROR);
});

module.exports = app;
