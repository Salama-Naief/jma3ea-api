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
	mail:{
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		username: process.env.MAIL_USERNAME,
		password: process.env.MAIL_PASSWORD,
	},
	cache: {
		life_time: parseInt(process.env.CACHE_LIFE_TIME),
    	prefix: process.env.CACHE_PREFIX,
	},
	date: {
		format: process.env.DATE_FORMAT,
	},
    local: process.env.APP_LOCAL,
    base_url_level: process.env.APP_BASE_URL_LEVEL,
    media_url: process.env.MEDIA_URL,
    api_base_url: process.env.API_BASE_URL,
    site_base_url: process.env.SITE_BASE_URL,
    google_api_key: process.env.GOOGLE_API_KEY,
};
