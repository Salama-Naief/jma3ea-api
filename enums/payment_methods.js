module.exports = (req) => {
	return [
		{
			id: 'cod',
			name: req ? req.custom.local.payment_method.cod : 'cod',
			valid: false
		},
		{
			id: 'wallet',
			name: req ? req.custom.local.payment_method.wallet : 'wallet',
			valid: false
		},
		{
			id: 'knet',
			name: req ? req.custom.local.payment_method.knet : 'knet',
			valid: true
		}
	];
};
