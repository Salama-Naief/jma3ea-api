const locals = {
	address_name_exists: 'Address name is already exists',
	can_not_delete_default_address: 'You cannot delete the primary address',
	cart_coupon_added: 'Coupon has been added',
	cart_coupon_unavailable: 'Coupon is unavailable',
	cart_has_not_products: 'Your cart has no products',
	cart_product_added: 'Product has been added to cart',
	cart_product_exceeded_allowed: 'Sorry you have exceeded the maximum allowed quantity',
	cart_product_exceeded_allowed_updated: 'Sorry you have exceeded the maximum allowed quantity, Quantity has been updated',
	cart_product_exists: 'Product is already exists in cart',
	cart_product_not: 'Product is not in cart',
	cart_product_removed: 'Product has been removed',
	cart_product_unavailable: 'Product is unavailable',
	cart_repeated: 'Order has been repeated',
	choose_city_first: 'Choose city first',
	city_is_not_exists: 'City is not exists',
	convert2wallet_closed: 'Convert points to wallet is not available now',
	dear: 'Dear',
	default_address: 'Primary Address',
	deleted_done: 'Item has been deleted successfully.',
	delivery_time_available: 'Available',
	device_added: 'Device has been added successfully',
	device_removed: 'Device has been removed successfully',
	direction: 'ltr',
	discount: 'Discount',
	error_required_address: 'Address is required',
	evaluated_before: 'This order is evaluated before',
	failed_auth: 'Failed to authenticate token.',
	failed_auth_app: 'There was a problem checking the application.',
	failed_auth_user: 'There was a problem checking user credentials.',
	failed_create_auth_app: 'There was a problem registering the application.',
	id_not_valid: 'Id is not valid',
	invalid_location: 'You selected invalid location, Please select another location that we cover it',
	new_order: 'New Order',
	no_data_found: 'No data found',
	no_enough_points: 'Sorry, You don\'t have enough points',
	no_enough_wallet: 'There is no enough money in your wallet',
	no_settings: 'No settings provided.',
	no_token: 'No token provided.',
	order_id: 'Order Number',
	password_has_been_updated: 'Password has been updated',
	points2wallet_saved_done: 'Point has been converted to wallet successfully',
	point_not_valid: "Your choice is not a valid",
	price: 'Price',
	quantity: 'Quantity',
	registered_successfully: 'Your account has been registered successfully, Welcome ',
	saved_done: 'Item has been saved successfully.',
	shipping_cost: 'Shipping Cost',
	subtotal: 'Total Products',
	thanks_for_evaluation: 'Thank you for evaluating and contributing to the development Jm3eia',
	the_payment_method: 'Payment Method',
	total: 'Total',
	unexpected_error: 'Unexpected error',
	unauthorized_user: "You don't have permission to access this page",
	wishlist_product_added: "The product has been added successfully",
	wishlist_product_not: "The product is not exists in wishlist",
	wishlist_product_removed: "The product has been removed successfully",
	wishlist_product_unavailable: "The product is unavailable",
	error_message: {
		required: "",
	},
	payment_method: {
		cod: 'Cash on delivery (Cash / Knet)',
		knet: 'KNET Online Payment (Online)',
		wallet: 'Pay by Jm3eia Wallet',
	},
	order_status_list: {
		"0": 'Not confirmed',
		"1": 'Pending',
		"2": 'Processing',
		"3": 'On the way',
		"4": 'Delivered',
		"5": 'Canceled',
		"6": 'Disapproved',
		"7": 'Confirmed',
		"8": 'Returned',
		"9": 'Request reversed',
		"10": 'Return part of the amount',
		"11": 'Full refund',
		"12": 'Ready to pick',
		"13": 'Time is up',
		"14": 'Request is invalid',
	},
	mail: {
		checkout_items_in_cart: 'Products in your cart',
		checkout_this_paid_items: 'You have purchased some products from our website, here are the details',
		forgotpassword_c_b: 'To reset your password please follow the link below',
		forgotpassword_q: 'Forgot your password?',
		forgotpassword_thanks: 'Thanks.',
		reset_password_link_sent: 'Reset password link has been sent to your email, check your email.',
		reset_password_subject: 'Reset password',
		registerion_click_on: `Click on the link`,
		registerion_easy_shopping: `Shopping with us easier!`,
		registerion_footer1: 'Please note that the page to which you will be redirected via any email from Jm3eia.com is your account page. Also, we would like to draw your attention that Jm3eia will not redirect you to a page that is not on the Jm3eia website. ',
		registerion_footer2: 'Your cooperation with us is the most important way to maintain the integrity of your transactions through Jm3eia.com and the confidentiality of your information and privacy.',
		registerion_gift: (wallet) => {
			return `Congratulations, ${wallet} Kuwaiti Dinar has been added to your wallet`;
		},
		registerion_login: `Login`,
		registerion_need_help_send_to: 'If you need any queries or support send an email to',
		registerion_note1: 'When you log into your account, you will be able to do the following:',
		registerion_note2: 'The entire purchase process will be faster.',
		registerion_note3: 'You will be able to track your requests.',
		registerion_note4: 'You can browse previous requests.',
		registerion_note5: 'You will be able to change your account information at any time.',
		registerion_note6: 'You can change your password at any time.',
		registerion_or_call: 'Or contact us at',
		registerion_profile: `My Account`,
		registerion_subject: `Register new user`,
		registerion_to_login: 'To access your account at',
		registerion_top_page: 'At the top of the page, enter your email and password.',
		registerion_welcome: 'Hello',
		registerion_your_name: 'IMPORTANT: Your current username is:',
		registerion_your_username_description: 'Your username is advertised and will be used in the URL of your profile address, profile name, and linked to the items you will purchase',
	},
	order_should_be_more_then: ({
		value,
		currency
	}) => {
		return `The order should be more then ${value} ${currency}`
	},
	fields: {
		address_id: 'Address',
		address_name: 'Address Name',
		address: 'Address',
		apartment_number: 'Apartment Number',
		city_id: 'City',
		coupon: 'Promo Code',
		delivery_time: 'Delivery Time',
		driver: 'Driver',
		email: 'Email',
		floor: 'Floor',
		fullname: 'Full Name',
		gada: 'Gada',
		hash: 'Hash',
		house: 'House',
		latitude: 'Location',
		longitude: 'Location',
		mobile: 'Mobile',
		name: 'Name',
		new_password: 'New Password',
		notes: 'Notes',
		old_password: 'Old Password',
		password: 'Password',
		payment_method: 'Payment Method',
		product_id: 'Product',
		sku: 'Product',
		quantity: 'Quantity',
		re_new_password: 'Re-type new password',
		reset_hash: 'Reset hash',
		street: 'Street',
		token: 'Device token',
		type: 'Device type',
		username: 'Username',
		widget: 'Block',
	},
	errors: {
		required: (key) => {
			return `${locals.fields[key]} is required`
		},
		required_or: (key, key_or) => {
			return `${locals.fields[key]} or ${locals.fields[key_or]} is required`
		},
		should_be_equal: (key, value) => {
			return `${locals.fields[key]} should be equal ${value}`
		},
		length_should_be_equal: (key, value) => {
			return `${locals.fields[key]} should be equal ${value} numbers or letters`
		},
		should_be_more_then: (key, value) => {
			return `${locals.fields[key]} should be more then ${value}`
		},
		should_be_less_then: (key, value) => {
			return `${locals.fields[key]} should be less then ${value}`
		},
		is_not_valid: (key) => {
			return `${locals.fields[key]} is not valid`
		},
		should_be_unique: (key) => {
			return `${locals.fields[key]} is exists`
		},
		is_not_exists: (key) => {
			return `${locals.fields[key]} is not exists`
		},
	}
};

module.exports = locals;