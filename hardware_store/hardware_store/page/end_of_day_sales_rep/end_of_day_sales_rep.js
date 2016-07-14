frappe.pages['end-of-day-sales-rep'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'EOD Report',
		single_column: true
	});
	wrapper.end_of_day_sales_rep = new erpnext.EodReport(wrapper);
	frappe.breadcrumbs.add("Hardware Store");
}

erpnext.EodReport = Class.extend({
	init: function(wrapper) {
		var me = this;
		// 0 setTimeout hack - this gives time for canvas to get width and height
		setTimeout(function() {
			me.setup(wrapper);
			me.get_data();
			me.get_data_payment();
			me.get_data_expense();
			me.get_data_currency();
			me.get_data_balance();
		}, 0);
	},
	setup: function(wrapper) {
		var me = this;

		this.elements = {
			layout: $(wrapper).find(".layout-main"),
			to_date: wrapper.page.add_date(__("Date")),
			refresh_btn: wrapper.page.set_primary_action(__("Refresh"),
				function() { 
							me.get_data();
							me.get_data_payment();
							me.get_data_expense();
							me.get_data_currency();
							me.get_data_balance();
						}, "icon-refresh"),
			export_btn: wrapper.page.set_secondary_action(__("Export"),
				function() { 
							me.get_data_export();
						}, "icon-refresh"),
		};

		this.elements.no_data = $('<div class="alert alert-warning">' + __("No Data") + '</div>')
			.toggle(false)
			.appendTo(this.elements.layout);

		this.elements.eod_wrapper = $('<div class="eod-wrapper" style="border: 1px solid #d1d8dd; padding: 15px;">\
			 <div class="row pos-item-toolbar">\
                <div class="sales-total col-sm-12 ">\
                	<div style="font-size: 21px;">Sales Total</div>\
                	<div class="child-table-sales"></div>\
                </div>\
             </div>\
              <div class="row pos-item-toolbar">\
                <div class="payment_to_accounts col-sm-12 ">\
                	<div style="font-size: 21px;">Payment to Accounts</div>\
                	<div class="child-table-payment"></div>\
                </div>\
             </div>\
              <div class="row pos-item-toolbar">\
                <div class="expenses col-sm-12 ">\
                	<div style="font-size: 21px;">Expenses</div>\
                	<div class="child-table-expenses"></div>\
                </div>\
             </div>\
              <div class="row pos-item-toolbar">\
                <div class="currency-exchange col-sm-12 ">\
                	<div style="font-size: 21px;">Currency Exchange</div>\
                	<div class="child-table-currency"></div>\
                </div>\
             </div>\
              <div class="row pos-item-toolbar">\
                <div class="balance col-sm-12 ">\
                	<div style="font-size: 21px;">Balance</div>\
                	<div class="child-table-balance"></div>\
                </div>\
             </div>\
			</div>')
			.insertAfter(this.elements.layout);

		this.elements.child_sales_total = $('<div class="search-area col-sm-7" style="width:50%;">\
			</div>').appendTo($(wrapper).find(".eod-wrapper").find(".pos-item-toolbar").find(".child-table-sales"))
		this.elements.child_payment = $('<div class="search-area col-sm-7" style="width:60%;">\
			</div>').appendTo($(wrapper).find(".eod-wrapper").find(".pos-item-toolbar").find(".child-table-payment"))
		this.elements.child_expenses = $('<div class="search-area col-sm-7" style="width:50%;">\
			</div>').appendTo($(wrapper).find(".eod-wrapper").find(".pos-item-toolbar").find(".child-table-expenses"))
		this.elements.child_currency = $('<div class="search-area col-sm-7" style="width:50%;">\
			</div>').appendTo($(wrapper).find(".eod-wrapper").find(".pos-item-toolbar").find(".child-table-currency"))
		this.elements.child_balance = $('<div class="search-area col-sm-7" style="width:50%;">\
			</div>').appendTo($(wrapper).find(".eod-wrapper").find(".pos-item-toolbar").find(".child-table-balance"))
		

		this.options = {
			to_date: frappe.datetime.get_today()
		};

		// set defaults and bind on change
		$.each(this.options, function(k, v) {
			me.elements[k].val(frappe.datetime.str_to_user(v));
			me.elements[k].on("change", function() {
				me.options[k] = frappe.datetime.user_to_str($(this).val());
				me.get_data();
				me.get_data_payment(this);
				me.get_data_expense();
				me.get_data_currency();
				me.get_data_balance();
			});
		});

		// bind refresh
		this.elements.refresh_btn.on("click", function() {
			me.get_data(this);
			me.get_data_payment(this);
			me.get_data_expense(this);
			me.get_data_currency(this);
			me.get_data_balance(this);
			// this.elements.eod_wrapper
		});

		// bind resize
		// $(window).resize(function() {
		// 	me.render();
		// });
	},
	get_data: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.get_sales_total",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(r.message && r.message[0].posting_date){
						me.elements.child_sales_total.show();
						me.elements.child_sales_total.html(frappe.render_template("sales_total", {"data":r.message}))	
					} 
					else {
					
						me.elements.child_sales_total.hide();
					}
				}
			}
		});
	},
	get_data_payment: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.get_payment",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(r.message){
						me.elements.child_payment.show();
						me.elements.child_payment.html(frappe.render_template("payment", {"data":r.message}))	
					}
					else {
						me.elements.child_payment.hide();
					}
				}
			}
		});
	},
	get_data_expense: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.get_expense",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(r.message){
						me.elements.child_expenses.show();
						me.elements.child_expenses.html(frappe.render_template("expense", 
															{"data":r.message}))	
					}
					else {
						me.elements.child_expenses.hide();
					}
				}
			}
		});
	},
	get_data_currency: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.get_currency_exchange",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(r.message){
						me.elements.child_currency.show();
						me.elements.child_currency.html(frappe.render_template("currency_exchange", {"data":r.message}))	
			
					}
					else {
						me.elements.child_currency.hide();
					}
				}
			}
		});
	},
	get_data_balance: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.get_balance",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					if(r.message){
						me.elements.child_balance.show();
						me.elements.child_balance.html(frappe.render_template("balance", {"data":r.message}))	
			
					}
					else {
						me.elements.child_balance.hide();
					}
				}
			}
		});
	},
	get_data_export: function(btn) {
		var me = this;
		frappe.call({
			method: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.create_csv",
			args: {
				to_date: this.options.to_date
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					// if(r.message){
					// 	me.elements.child_balance.show();
					// 	me.elements.child_balance.html(frappe.render_template("balance", {"data":r.message}))	
			
					// }
					// else {
					// 	me.elements.child_balance.hide();
					// }
				}
			}
		});
	},
	get_data_export:function() {
		window.location.href = repl(frappe.request.url +
			'?cmd=%(cmd)s&to_date=%(to_date)s', {
				cmd: "hardware_store.hardware_store.page.end_of_day_sales_rep.end_of_day_sales_rep.create_csv",
				to_date: this.options.to_date,
			});
	},

})