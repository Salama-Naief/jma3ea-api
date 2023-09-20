const config = require('../config');
const axios = require('axios');

module.exports.sendSms = async function (to, text) {
	let apiKey = config.sms.api_key;
	let senderId = 701;
	let sendType = 1;
	let smsContent = '';
	let smsType = 'otp';

	if (!apiKey) {
		return null;
		
	}

	return axios({method:'get',url:`https://kuwait.uigtc.com/capi/sms/send_sms?api_key=${apiKey}&sender_id=${senderId}&send_type=${sendType}&sms_content=${text}&numbers=965${to}`})
		.then(function (response) {
			return response;
		})
		.catch(function (error) {
			console.error(error);
			return null;
		});
};
