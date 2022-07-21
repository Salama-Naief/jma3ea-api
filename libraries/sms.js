const config = require('../config');
const axios = require('axios');

module.exports.sendSms = async function (to, text) {
	let username='jm3eia';
	let password = '@Makkah786';
	let sender = '96594469079';

	var config = {
		method: 'get',
		url: `https://www.kwtsms.com/API/send/?username=${username}&password=${password}&sender=${sender}&mobile=${to}&lang=1&message=${text}`
	};

	return axios(config)
		.then(function (response) {
			return response;
		})
		.catch(function (error) {
			console.log('******* SMS Send ERROR *******');
			console.log(error);
		});
};
