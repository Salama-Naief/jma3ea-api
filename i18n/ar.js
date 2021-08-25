const locals = {
	address_name_exists: 'إسم العنوان موجود مسبقاً',
	can_not_delete_default_address: 'لا يمكنك حذف العنوان الأساسي',
	cart_has_not_products: 'السلة لا تحتوي على منتجات',
	cart_coupon_added: 'تم إضافة الكوبون',
	cart_coupon_unavailable: 'الكوبون غير متاح',
	cart_product_added: 'تم إضافة المنتج إلى السلة',
	cart_product_exceeded_allowed: 'عفوا هذه الكمية أكبر من المسموح به لهذا المنتج',
	cart_product_exceeded_allowed_updated: 'عفوا هذه الكمية أكبر من المتوفر لدينا, تم تحديث الكمية',
	cart_product_exists: 'هذا المنتج موجود بالفعل في السلة',
	cart_product_not: 'المنتج غير موجود بالسلة',
	cart_product_removed: 'تم حذف المنتج',
	cart_product_unavailable: 'المنتج غير متاح',
	cart_repeated: 'تم إضافة منتجات الطلب إلى السلة بنجاح',
	choose_city_first: 'إختر المدينة أولاً',
	city_is_not_exists: 'المدينة غير موجودة',
	convert2wallet_closed: 'تحويل النقاط إلى رصيد غير متاح حالياً',
	dear: 'عزيزي',
	default_address: 'العنوان الأساسي',
	deleted_done: 'تم الحذف بنجاح',
	delivery_time_available: 'متاح',
	device_added: 'تم إضافة الجهاز بنجاح',
	device_removed: 'تم حذف الجهاز بنجاح',
	direction: 'rtl',
	discount: 'الخصم',
	error_required_address: 'العنوان مطلوب',
	evaluated_before: 'هذا الطلب تم تقييمه من قبل',
	failed_auth: 'خطأ في التحقق',
	failed_auth_app: 'خطأ في التحقق من التطبيق',
	failed_auth_user: 'خطا في التحقق من بيانات المستخدم',
	failed_create_auth_app: 'حدث خطأ أثناء إنشاء مفتاح جديد',
	hash_error: 'المفتاح غير صالح',
	id_not_valid: 'المعرف غير صالح',
	invalid_location: 'لقد حددت موقعًا غير صالح ، يرجى تحديد موقع آخر نقوم بتغطيته',
	logout_done: 'تم تسجيل الخروج بنجاح',
	new_order: 'طلب شراء',
	no_data_found: 'لا يوجد بيانات',
	no_enough_points: 'يجب ان تكون النقاط ١٠٠ أو أكثر لتحويلها الى رصيد بالمحفظه',
	no_enough_wallet: 'لا يوجد رصيد كافي',
	no_user_found: 'هذا المستخدم غير مسجل',
	no_settings: 'لا يوجد إعدادات',
	no_token: 'لا يوجد مفتاح',
	or: 'أو',
	order_date: 'تاريخ الطلب',
	order_id: 'رقم الطلب',
	password_has_been_updated: 'تم تحديث كلمة المرور بنجاح',
	points2wallet_saved_done: 'تم تحويل النقاط إلى رصيد بنجاح',
	price: 'السعر',
	quantity: 'الكمية',
	registered_successfully: 'تم تسجيل حسابك بنجاح, مرحباً بك يا ',
	saved_done: 'تم الحفظ بنجاح',
	shipping_cost: 'تكلفة الشحن',
	subtotal: 'إجمالي المنتجات',
	thanks_for_evaluation: 'شكراً لتقييم ومساهمتك في تطور الجمعية',
	the_payment_method: 'وسيلة الدفع',
	total: 'الإجمالي',
	unexpected_error: 'خطأ غير متوقع',
	unauthorized_user: "أنت لا تملك صلاحيات الدخول إلى هذه الصفحة",
	wishlist_product_added: "تم إضافة المنتج إلى قائمة رغباتي بنجاح",
	wishlist_product_not: "المنتج غير موجود في قائمة رغباتي",
	wishlist_product_removed: "تم حذف المنتج من قائمة رغباتي بنجاح",
	wishlist_product_unavailable: "هذا المنتج غير متاح",
	payment_method: {
		cod: 'الدفع عند الاستلام (كاش / كي نت)',
		knet: 'الدفع ببطاقة الكي نت (أون لاين)',
		wallet: 'الدفع من رصيد الجمعية',
	},
	order_status_list: {
		"0": 'لم يتم التأكيد',
		"1": 'معلق',
		"2": 'جاري التجهيز',
		"3": 'جاري التوصيل',
		"4": 'تم التوصيل',
		"5": 'ملغي',
		"6": 'مرفوض',
		"7": 'تم التأكيد',
		"8": 'مردود',
		"9": 'تم عكس الطلب',
		"10": 'إعادة جزء من المبلغ',
		"11": 'إعادة كامل المبلغ',
		"12": 'جاهز للتوصيل',
		"13": 'انتهاء الوقت',
		"14": 'الطلب باطل',
	},
	mail: {
		checkout_items_in_cart: 'المنتجات الموجود في السلة الخاصة بك',
		checkout_this_paid_items: 'لقد قمت بشراء بعض المنتجات من موقعنا, إليك التفاصيل',
		forgotpassword_c_b: 'لإعادة ضبط كلمة مرورك ، يرجى اتباع الرابط أدناه',
		forgotpassword_q: 'نسيت كلمة المرور؟',
		forgotpassword_thanks: 'شكراً لكم',
		reset_password_link_sent: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ، تحقق من بريدك الإلكتروني.',
		reset_password_subject: 'إعادة تعيين كلمة المرور',
		registerion_click_on: `اضغط على رابط`,
		registerion_easy_shopping: `التسوق معنا أسهل!`,
		registerion_footer1: 'يرجى الإنتباه إلى أن الصفحة التي سيتم تحويلك إليها عبر أية رسالة إلكترونية صادرة من جمعية دوت كوم هي صفحة حسابك. كذلك، نود لفت نظرك إلى أن جمعية دوت كوم لن يقوم بتحويلك إلى صفحة غير موجودة على موقع جمعية دوت كوم.',
		registerion_footer2: 'تعاونك معنا هو أهم وسيلة للحفاظ على نزاهة تعاملاتك عبر جمعية دوت كوم و على سرية معلوماتك و خصوصيتك.',
		registerion_gift: (wallet) => {
			return `مبروك كسبت ${wallet} دينار كويتي`;
		},
		registerion_login: `دخول`,
		registerion_need_help_send_to: 'اذا كنت بحاجة الى أية استفسارت أو مساندة أرسل ايميل الى',
		registerion_note1: 'عند دخولك إلى حسابك، سوف تستطيـع القيـام بالامور التاليـة:',
		registerion_note2: 'ستكون عملية الشراء بكاملها أسرع.',
		registerion_note3: 'سيكون بمقدورك متابعة طلباتك .',
		registerion_note4: 'بإمكانك استعراض الطلبات السابقة.',
		registerion_note5: 'سيكون باستطاعتك تغيير معلومات حسابك في أي وقت.',
		registerion_note6: 'بإمكانك تغيير كلمة السر متى شئت.',
		registerion_or_call: ' أو اتصل بنا على ',
		registerion_profile: `حسابي`,
		registerion_subject: `تسجيل مستخدم جديد`,
		registerion_to_login: 'للدخول إلى حسابك على',
		registerion_top_page: 'في أعلى الصفحة، ثم قم بإدخال بريدك الإلكتروني وكلمة السر .',
		registerion_welcome: 'مرحبــاً',
		registerion_your_name: 'هام: إسم المستخدم الخاص بك حالياً هو:',
		registerion_your_username_description: 'إسم المستخدم الخاص بك مُعلن و سيتم إستخدامه في رابط عنوان صفحتك الشخصية، إسم صفحتك الشخصية، و مربوط مع السلع اللتي ستقوم بشرائها',
	},
	order_should_be_more_then: ({
		value,
		currency
	}) => {
		return `يجب أن تكون قيمة المشتريات ${value} ${currency}`
	},
	fields: {
		address_id: 'العنوان',
		address_name: 'إسم العنوان',
		address: 'العنوان',
		city_id: 'المدينة',
		coupon: 'كود الخصم',
		delivery_time: 'وقت التوصيل',
		driver: 'السائق',
		email: 'البريد الإلكتروني',
		fullname: 'الإسم بالكامل',
		gada: 'الجادة',
		hash: 'الهاش',
		house: 'المنزل',
		latitude: 'موقع الخريطة',
		longitude: 'موقع الخريطة',
		mobile: 'التليفون',
		name: 'الإسم',
		new_password: 'كلمة المرور الجديدة',
		notes: 'الملاحظات',
		old_password: 'كلمة المرور القديمة',
		password: 'كلمه السر',
		payment_method: 'وسيلة الدفع',
		product_id: 'المنتج',
		quantity: 'الكمية',
		re_new_password: 'إعادة كلمة المرور الجديدة',
		reset_hash: 'شفرة إعادة كلمة المرور',
		street: 'الشارع',
		token: 'رقم الجهاز',
		type: 'نوع الجهاز',
		username: 'اسم المستخدم',
		widget: 'القطعة',
	},
	errors: {
		required: (key) => {
			return `${locals.fields[key]} مطلوب`
		},
		required_or: (key, key_or) => {
			return `${locals.fields[key]} أو ${locals.fields[key_or]} مطلوب`
		},
		should_be_equal: (key, value) => {
			return `${locals.fields[key]} لا بد أن يساوي ${value}`
		},
		length_should_be_equal: (key, value) => {
			return `${locals.fields[key]} لا بد أن يساوي ${value} حرفاً أو رقماً`
		},
		should_be_more_then: (key, value) => {
			return `${locals.fields[key]} لا بد أن أكبر من ${value}`
		},
		should_be_less_then: (key, value) => {
			return `${locals.fields[key]} لا بد أن أقل من ${value}`
		},
		is_not_valid: (key) => {
			return `${locals.fields[key]} غير صالح`
		},
		should_be_unique: (key) => {
			return `${locals.fields[key]} موجود مسبقاً`
		},
		is_not_exists: (key) => {
			return `${locals.fields[key]} غير موجود`
		},
	}
};

module.exports = locals;
