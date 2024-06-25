// Load required modules
require("dotenv").config();

const http = require("http");
const https = require("https");

http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;

const createError = require("http-errors");
const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const status_message = require("./enums/status_message");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

process.env.TZ = config.date.timezone || process.env.TZ;

const app = express();

(async () => {
  const authorization_mw = require("./libraries/middlewares/authorization");
  const analytics_mw = require("./libraries/middlewares/analytics");
  const app_version_mw = require("./libraries/middlewares/app_version");
  const filter_mw = require("./libraries/middlewares/filter");
  const i18n_mw = require("./libraries/middlewares/i18n");
  const initialize_mw = require("./libraries/middlewares/initialize");
  const pagination_mw = require("./libraries/middlewares/pagination");
  const response_mw = require("./libraries/middlewares/response");
  const settings_mw = require("./libraries/middlewares/settings");
  const sorting_mw = require("./libraries/middlewares/sorting");
  const update_language_mw = require("./libraries/middlewares/update_language");
  const validation_mw = require("./libraries/middlewares/validation");
  //const token_expiration_mw = require('./libraries/middlewares/token_expiration');

  app.use(initialize_mw(__dirname));
  app.use(response_mw);
  app.use(i18n_mw(path.resolve("i18n")));
  app.use(app_version_mw);

  const MongoClient = require("mongodb").MongoClient;

  const url =
    config.db.url ||
    `mongodb://${config.db.username}:${config.db.password}@localhost:27017/`;
  const db = await MongoClient.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then((client) => {
      console.log("Connected successfully to server");
      return client.db(config.db.name);
    })
    .catch((e) => e);

  app.use((req, res, next) => {
    req.custom.db = db;
    next();
  });

  const redis = require("redis");
  const redis_client = redis.createClient({
    url: config.redis.url,
    // host: config.redis.host,
    // port: config.redis.port,
    // password: config.redis.password || undefined,
    retry_strategy: function (options) {
      if (options.error && options.error.code === "ECONNREFUSED") {
        return new Error("The server refused the connection");
      }
      return Math.min(options.attempt * 100, 3000);
    },
  });

  redis_client.on("error", function (err) {
    console.error(err);
  });
  const cache_lib = require("./libraries/cache")(redis_client);
  cache_lib.init();
  app.use((req, res, next) => {
    req.custom.cache = cache_lib;
    next();
  });

  app.use(authorization_mw);
  //app.use(token_expiration);
  app.use(settings_mw);
  app.use(analytics_mw);
  app.use(update_language_mw);
  app.use(filter_mw);
  app.use(sorting_mw);
  app.use(pagination_mw);
  app.use(validation_mw);

  app.use(logger("dev"));
  app.use(express.json());
  app.use(compression());
  app.use(
    express.urlencoded({
      extended: false,
    })
  );
  app.use(cookieParser());

  const cors = require("cors");
  const corsOptions = {
    origin: config.origin,
    optionsSuccessStatus: 200,
  };

  app.use(cors({ origin: "*" }));

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

  process.on("warning", (e) => console.warn(e.stack));

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
    console.error("Unhandled Error at:", req.originalUrl, req.method, err);
    res.out(
      {
        errors: "Error!",
      },
      status_message.UNEXPECTED_ERROR
    );
  });
})();

module.exports = app;
