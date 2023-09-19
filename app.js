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
const config = require('./config');
const status_message = require('./enums/status_message');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

process.env.TZ = config.date.timezone || process.env.TZ;

const app = express();

const authorization = require('./libraries/middlewares/authorization');
const analytics = require('./libraries/middlewares/analytics');
const app_version = require('./libraries/middlewares/app_version');
const cache = require('./libraries/middlewares/cache');
const database = require('./libraries/middlewares/database');
const filter = require('./libraries/middlewares/filter');
const i18n = require('./libraries/middlewares/i18n');
const initialize = require('./libraries/middlewares/initialize');
const pagination = require('./libraries/middlewares/pagination');
const response = require('./libraries/middlewares/response');
const settings = require('./libraries/middlewares/settings');
const sorting = require('./libraries/middlewares/sorting');
const update_language = require('./libraries/middlewares/update_language');
const validation = require('./libraries/middlewares/validation');

app.use(initialize(__dirname));
app.use(response);
app.use(i18n(path.resolve('i18n')));
app.use(app_version);
app.use(database);
app.use(cache);
app.use(authorization);
app.use(settings);
app.use(analytics);
app.use(update_language);
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

Sentry.init({
	dsn: config.sentry.dsn,
	integrations: [
		// enable HTTP calls tracing
		new Sentry.Integrations.Http({ tracing: true }),
		// enable Express.js middleware tracing
		new Tracing.Integrations.Express({ app }),
	],

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	tracesSampleRate: 1.0,
});

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

process.on('warning', e => console.warn(e.stack));

const all_modules = fs.readdirSync(path.join(__dirname, `modules`));
for (const moduleName of all_modules) {
	// api
	const moduleRouter = require(`./modules/${moduleName}/route`);
	app.use(`/v3/${moduleName}`, moduleRouter);
}

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
	// The error id is attached to `res.sentry` to be returned
	// and optionally displayed to the user for support.
	console.error('Error at:', req.originalUrl, req.method);
	res.out({
		errors: 'Error!',
	}, status_message.UNEXPECTED_ERROR);
});

module.exports = app;
