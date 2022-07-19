/**
 * Application Config.
 */
module.exports = {
	db: {
		name: process.env.DB_NAME,
		url: process.env.DB_URL,
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		admindb: process.env.DB_ADMIN_DB,
		limit: parseInt(process.env.DB_LIMIT)
	},
	redis: {
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT,
		password: process.env.REDIS_PASS
	},
	mail: {
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		username: process.env.MAIL_USERNAME,
		password: process.env.MAIL_PASSWORD,
		from: process.env.MAIL_FROM
	},
	cache: {
		life_time: {
			data: parseInt(process.env.CACHE_LIFE_TIME_DATA) || 1,
			token: parseInt(process.env.CACHE_LIFE_TIME_TOKEN) || (24 * 15)
		},
		prefix: process.env.CACHE_PREFIX
	},
	date: {
		format: process.env.DATE_FORMAT,
		timezone: process.env.DATE_TIMEZONE || process.env.TZ,
		utc: parseInt(process.env.DATE_UTC)
	},
	order: {
		disabled_payment_methods: process.env.ORDER_DISABLED_PAYMENT_METHODS ? process.env.ORDER_DISABLED_PAYMENT_METHODS.split(',') : [],
		delivery_time_is_required: process.env.ORDER_DELIVERY_TIME_IS_REQUIRED === undefined || process.env.ORDER_DELIVERY_TIME_IS_REQUIRED === true
	},
	mobile: {
		app_store_url: process.env.MOBILE_APP_STORE_URL,
		google_play_url: process.env.MOBILE_GOOGLE_PLAY_URL,
		app_gallery_url: process.env.MOBILE_APP_GALLERY_URL
	},
	tracking: {
		adjust: {
			token: process.env.TRACKING_ADJUST_TOKEN,
			events: {
				add_to_cart: process.env.TRACKING_ADJUST_EVENTS_ADD_TO_CART,
				complete_purchase: process.env.TRACKING_ADJUST_EVENTS_COMPLETE_PURCHASE,
				register: process.env.TRACKING_ADJUST_EVENTS_REGISTER,
			}
		}
	},
	info: {
		domain: process.env.DOMAIN_NAME,
		website_name: {
			ar: process.env.WEBSITE_NAME_AR,
			en: process.env.WEBSITE_NAME_EN,
		}
	},
	desktop: {
		app_id: process.env.DESKTOP_APP_ID,
		app_secret: process.env.DESKTOP_APP_SECRET,
		email: process.env.DESKTOP_EMAIL,
		password: process.env.DESKTOP_PASSWORD,
		base_url: process.env.DESKTOP_BASE_URL,
	},
	api_version: process.env.API_VERSION,
	local: process.env.APP_LOCAL,
	base_url_level: process.env.APP_BASE_URL_LEVEL,
	media_url: process.env.MEDIA_URL,
	api_base_url: process.env.API_BASE_URL,
	site_base_url: process.env.SITE_BASE_URL,
	google_api_key: process.env.GOOGLE_API_KEY,
	google_analytics_key: process.env.GOOGLE_ANALYTICS_KEY,
	env: process.env.APP_ENV,
	denied_agents: process.env.DENIED_AGENTS,
	secret: process.env.APP_SECRET,
	base_media_dir: process.env.APP_BASE_MEDIA_DIR,
	data_to_save: process.env.IGNORE_REQUIRED_FIELDS ? process.env.IGNORE_REQUIRED_FIELDS.split(',') : [],
	auto_load_city: process.env.AUTO_LOAD_CITY,
	sentry: {
		dsn: process.env.SENTRY_DSN,
	},
};
