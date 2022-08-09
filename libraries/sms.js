const config = require('../config');
const axios = require('axios');

module.exports.sendSms = async function (to, text) {
	let apiKey = '782.5C6219BF01D9EE9D72691F7AF1D969F6';
	let senderId = 701;
	let sendType = 1;
	let smsContent = '';
	let smsType = 'otp';

	var config = {
		method: 'post',
		url: `https://kuwait.uigtc.com/capi/sms/send_sms`, 
		data: {
			api_key: apiKey,
			sender_id: senderId,
			send_type: sendType,
			sms_content:text,
			numbers:'965' +  to,
			type:smsType
		},
		headers: { "Content-Type": "application/json" },

	};

	return axios({method:'get',url:`https://kuwait.uigtc.com/capi/sms/send_sms?api_key=${apiKey}&sender_id=${senderId}&send_type=${sendType}&sms_content=${text}&numbers=965${to}`})
		.then(function (response) {
			console.log(response);
			return response;
		})
		.catch(function (error) {
			console.log('******* SMS Send ERROR *******');
			console.log(error);
		});
};
