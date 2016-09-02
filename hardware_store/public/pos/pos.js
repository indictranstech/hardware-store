// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.provide("erpnext.pos");

erpnext.pos.PointOfSale = Class.extend({
	init: function(wrapper, frm) {
		this.wrapper = wrapper;
		this.frm = frm;
		this.wrapper.html(frappe.render_template("pos", {currency: this.frm.currency}));

		this.check_transaction_type();
		this.make();
		// this.make_expense_entry();

		var me = this;
		$(this.frm.wrapper).on("refresh-fields", function() {
			me.refresh();
		});

		if(!(frappe.get_cookie("user_id") == "Administrator") && inList(user_roles,"Cashier")){
			this.wrapper.find('.discount-field-col').hide()
		}
		this.wrapper.find('input.discount-percentage').on("change", function() {
			frappe.model.set_value(me.frm.doctype, me.frm.docname,
				"additional_discount_percentage", flt(this.value));
		});
		
		if(cur_frm.doc.__islocal){
			$("body").keydown(function(e){
				if(e.keyCode == 81 && e.ctrlKey){
					map_quotation_to_invoice()
				}
			});
		}
		if(cur_frm.doc.__islocal){
			$("body").keydown(function(e){
				if(e.keyCode == 69 && e.ctrlKey){
					$("body").find(".btn.btn-secondary.btn-default").click()
				}
			});
		}

		if(cur_frm.doc.__islocal){
			$("body").keydown(function(e){
				if(e.keyCode == 88 && e.ctrlKey){
					$("body").find(".currency-convertor").find(".btn-default").click()
				}
			});

		}
		if(cur_frm.doc.__islocal){
			$("body").keydown(function(e){
				if(e.keyCode == 65 && e.ctrlKey){
					$("body").find(".btn.btn-primary.btn-sm.primary-action").click()
				}
			});

		}

		this.wrapper.find('input.discount-amount').on("change", function() {
			value = flt(this.value)
			frappe.call({
				method: "hardware_store.hardware_store.doctype.configuration.configuration.discount_limit",
			    callback: function(r) {
			        if (r.message) {
			            if (r.message[0] >= me.frm.doc.net_total) {
			            	frappe.model.set_value(me.frm.doctype, me.frm.docname, "discount_amount", 0.0);
			            	me.wrapper.find('input.discount-amount').val(0.0)
			            	msgprint("To apply Discount , Net total should be greater the limit specified in configuration ")
			            } 
			            else {
			            	if (value <= r.message[1]){
			            		frappe.model.set_value(me.frm.doctype, me.frm.docname, "discount_amount", value);
			            	}else{
			            		frappe.model.set_value(me.frm.doctype, me.frm.docname, "discount_amount", 0.0);
			            		me.wrapper.find('input.discount-amount').val(0.0)
			            		msgprint(__("Discount should not be greater than Discount Value") +" "+ r.message[1])
			            	}
			            }
			        }
			    }
			})	
		});

		this.wrapper.find("input[data-fieldname='customer']").on("change click keyup focusout",function() {
			me.make_item_list()
		})

		// me.wrapper.find("input[data-fieldname='customer']").val()
	},
	check_transaction_type: function() {
		var me = this;

		// Check whether the transaction is "Sales" or "Purchase"
		if (frappe.meta.has_field(cur_frm.doc.doctype, "customer")) {
			this.set_transaction_defaults("Customer");
		}
		else if (frappe.meta.has_field(cur_frm.doc.doctype, "supplier")) {
			this.set_transaction_defaults("Supplier");
		}
	},
	set_transaction_defaults: function(party) {
		var me = this;
		this.party = party;
		this.price_list = (party == "Customer" ?
			this.frm.doc.selling_price_list : this.frm.doc.buying_price_list);
		this.price_list_field = (party == "Customer" ? "selling_price_list" : "buying_price_list");
		this.sales_or_purchase = (party == "Customer" ? "Sales" : "Purchase");
		// this.customer_group = this.frm.doc.customer_group
	},
	make: function() {
		this.make_party();
		this.make_search();
		this.make_item_list();
		this.make_si_from_quotation();
		// this.make_amount_given_by_customer();
		this.make_currency_convertor();
		this.make_expense_entry();
		this.make_stock_balance_report()
		// this.make_change_return();
	},
	make_party: function() {
		var me = this;
		this.party_field = frappe.ui.form.make_control({
			df: {
				"fieldtype": "Link",
				"options": this.party,
				"label": this.party,
				"fieldname": this.party.toLowerCase(),
				"placeholder": this.party
			},
			parent: this.wrapper.find(".party-area"),
			frm: this.frm,
			doctype: this.frm.doctype,
			docname: this.frm.docname,
			only_input: true,
		});
		this.party_field.make_input();
		this.party_field.$input.on("change", function() {
			if(!me.party_field.autocomplete_open)
				frappe.model.set_value(me.frm.doctype, me.frm.docname,
					me.party.toLowerCase(), this.value);
		});
	},
	make_search: function() {
		var me = this;
		this.search = frappe.ui.form.make_control({
			df: {
				"fieldtype": "Data",
				"label": "Item",
				"fieldname": "pos_item",
				"placeholder": "Search Item"
			},
			parent: this.wrapper.find(".search-area"),
			only_input: true,
		});
		this.search.make_input();
		this.search.$input.on("keypress", function() {
			if(!me.search.autocomplete_open)
				if(me.item_timeout)
					clearTimeout(me.item_timeout);
				me.item_timeout = setTimeout(function() { me.make_item_list(); }, 1000);
		});
	},

	// start of custom code
	// create si from quotation-
	make_amount_given_by_customer:function () {
		var me = this;
		this.amount_given_by_customer = frappe.ui.form.make_control({
			df: {
				"fieldtype": "Int",
				"label": "Amt Paid by Customer",
				"fieldname": "amt_paid_by_customer"
			},
			parent: this.wrapper.find(".amount-paid-by-customer"),
			only_input: true,
		});
		this.amount_given_by_customer.make_input();
			this.amount_given_by_customer.$input.on("focusout keyup", function(e) {
				var key=e.keyCode || e.which;
				if(key == 13) {
					me.calculate_change_return()
				}else{
					me.calculate_change_return()
				}
		});

	},
	calculate_change_return: function() {
		var me = this;
		paid_amount = this.wrapper.find("input[data-fieldname='amt_paid_by_customer']").val()
		grand_total = this.frm.doc.grand_total;
		var change_amount; 
		if(paid_amount && grand_total) {
			change_amount = paid_amount - grand_total
			
		}else{
			change_amount = 0
		}
		me.wrapper.find(".change-returned").text(format_currency(change_amount, me.frm.doc.currency))
	},

	make_change_return: function(){
		var me  = this;
		this.changes_return = frappe.ui.form.make_control({
			df: {
				"fieldtype": "Int",
				"label": "Change return",
				"fieldname": "change_return"
			},
			parent: this.wrapper.find(".change-returned"),
			only_input: true,
		});
		this.changes_return.make_input();
	},

	make_si_from_quotation: function() {
		if (this.frm.doctype == "Sales Invoice") {
			parent = this.wrapper.find(".quotation-area")
			quotation_btn = cur_frm.add_custom_button(__("Create from Quotation"),function() {
				frappe.model.map_current_doc({
						method: "hardware_store.customization.customization.make_sales_invoice",
						source_doctype: "Quotation",
						get_query_filters: {
							docstatus: 1,
							status: ["!=", "Lost"],
							order_type: cur_frm.doc.order_type,
							customer: cur_frm.doc.customer || undefined,
							company: cur_frm.doc.company
						}
					})

			});
			$(parent).append($(quotation_btn))
		}
		if (this.frm.doctype == "Quotation") {
			parent = this.wrapper.find(".quotation-area")
			sales_invoice_btn = cur_frm.add_custom_button(__("Create Sales Invoice"),function(){
				frappe.model.open_mapped_doc({
					method: "hardware_store.customization.quotation.make_sales_invoice",
					frm: cur_frm
				})
			});
			$(parent).append($(sales_invoice_btn))
		}	
	},
	make_currency_convertor: function() {
		var me = this;
		if (this.frm.doctype == "Sales Invoice"){
			parent = this.wrapper.find(".currency-convertor")
			convertor = cur_frm.add_custom_button(__("Convert Money"), function() {
				me.convert_money_customer()
				
			});
			$(parent).append($(convertor))
		}			
	},
	convert_money_customer:function() {
		var me = this;
		frappe.call({
	 		method : "hardware_store.customization.customization.convert_money_customer",
	 		callback:function(r) {
	 			if(r.message){
	 				cur_frm.set_value("customer",r.message[0]['name'])
	 				me.refresh();
				if (me.wrapper.find("input[data-fieldname='customer']").val() == "Convert Money Customer"){
					me.dialog_currency_convertor()
				}
	 			}
	 		}
	 	})
	},

	make_stock_balance_report: function() {
		var me = this;
			parent = this.wrapper.find(".report-item-area")
			item_stock = cur_frm.add_custom_button(__("Stock"), function() {
				if(me.frm.doc.items.length > 0){
					me.dialog_stock_balance()
				}else{
					msgprint(__("Please Select Item first"))
				}
			});
			$(parent).append($(item_stock))
	},

	dialog_stock_balance: function () {
		var me = this;
		frappe.call({
		method :"hardware_store.hardware_store.doctype.configuration.configuration.item_stock_balance",
		args : {  "arg": me.frm.doc.items },
		callback: function(r){
				var d = new frappe.ui.Dialog({
				width: 400,
				title: 'Stock balance Of Item Present on Cart',
				fields: [
					{fieldtype: 'HTML',
					fieldname: 'report' , label: __('Stock Balance')},
				]
				});
				d.show();
				if(r.message){
						$(d.body).find("[data-fieldname='report']").html(frappe.render_template("stock_balance", {"data":r.message}))
				}
			}
		})
	},

	dialog_currency_convertor: function  () {
		var me = this;
		var dialog = new frappe.ui.Dialog({
			width: 400,
			title: 'Convert Currency',
			fields: [
				{fieldtype:'HTML',
					fieldname:'currency_exchange_list', label: __('Currency List')},
				{fieldtype:'Section Break', label : __('Value to exchange'),
					fieldname:'sb20'},
				{fieldtype:'Link',
					fieldname:'convert_currency', label: __('Convert Currency'),
					options:'Currency'},
				{fieldtype:'Link',
					fieldname:'default_currency', label: __('Default Currency'),
					options:'Currency', "default": erpnext.get_currency()},
				{fieldtype:"Float",
					fieldname: 'exchange_rate', label: __('Exchange Rate')},
				{fieldtype:"Float",
					fieldname: 'usd_exchange_currency', label: __('USD Exch Currency')},
				{fieldtype:"Float",
					fieldname: 'usd_value', label: __('USD Currency')},
				{fieldtype:"Float",
					fieldname: 'convert_to', label: __('From Currency')},
				{fieldtype:"Float",
					fieldname: 'converted_currency', label: __('To Currency')},
				
			]
		});

		//make read only
		dialog.get_input('convert_currency').prop("disabled", true);
		dialog.get_input('default_currency').prop("disabled", true);
		dialog.get_input('convert_currency').parent('').parent('').parent('').parent('').hide()
		dialog.get_input('default_currency').parent('').parent('').parent('').parent('').hide()
		dialog.get_input('exchange_rate').parent('').parent('').parent('').parent('').hide()
		dialog.get_input('usd_exchange_currency').parent('').parent('').parent('').parent('').hide()
		dialog.get_input('exchange_rate').prop("disabled",true);
		dialog.get_input('converted_currency').prop("disabled", true)

		// dialog.fields_dict.default_currency.df.hidden = 1

			
		me.dialog = dialog;
		dialog.show();
		frappe.call({
				method : "hardware_store.hardware_store.doctype.configuration.configuration.currency_data",
				callback:function(r) {
					if(r.message){
						$(dialog.body).find("[data-fieldname='currency_exchange_list']").html(frappe.render_template("currency_exchange_rate_template", {"data":r.message}))
						for (var i =0 ; i< r.message.length ; i++){
							if(r.message[i].name =="USD-HTD" ){
								dialog.set_value("usd_exchange_currency", r.message[i]['exchange_rate'])
							}
							if(r.message[i].name == "HTD-HTG"){
								dialog.set_value("convert_currency", r.message[i]['from_currency'])
								dialog.set_value("default_currency", r.message[i]['to_currency'])
								
						var values = dialog.get_values();
						var df_obj = dialog.fields_dict
							if (values.default_currency && values.convert_currency) {
								dialog.fields_dict.exchange_rate.df.description = "1 " + values.convert_currency
											+ " = [?] " + values.default_currency
								dialog.fields_dict.exchange_rate.refresh();

								label_convert_to = dialog.fields_dict['convert_to'].df.label.split(" ")
								dialog.fields_dict['convert_to'].set_label(values.convert_currency +" "+ label_convert_to[1])

								label_converted_currency = dialog.fields_dict['converted_currency'].df.label.split(" ")
								dialog.fields_dict['converted_currency'].set_label(values.default_currency +" "+ label_converted_currency[1])
								dialog.set_value("exchange_rate", r.message[i]['exchange_rate'])
								me.frm.set_value("update_stock",0)
							}
						}
					}
								
					}
				}
			})
				
			dialog.get_input('usd_value').on("keyup", function(){
				var values = dialog.get_values();
				dialog.set_value("convert_to", flt(values.usd_exchange_currency * values.usd_value ))
				dialog.set_value("converted_currency", flt(values.exchange_rate * values.usd_value * values.usd_exchange_currency))
			})	

			dialog.get_input('convert_to').on("keyup", function(){
				var values = dialog.get_values();

				me.frm.set_value("conversion_rate",values.exchange_rate)
				dialog.set_value("usd_value", flt(values.convert_to / values.usd_exchange_currency ))
				dialog.set_value("converted_currency", flt(values.exchange_rate * values.convert_to ))
			})

			this.currency_save_button(dialog)
			
	},



	currency_save_button: function(dialog) {
		var me = this;
		dialog.set_primary_action(__("Save"), function() {
			if(dialog.get_input('convert_to').val()) {
				$.each(me.frm.doc["items"] || [], function(i, d) {
					frappe.model.clear_doc(d.doctype, d.name);
					me.refresh_grid();
				});
				me.add_new_item_for_money_convertor(dialog);
				dialog.hide();	
			}else{
				msgprint(__("Please Specify From Currency"))
			}
			me.refresh();
		})

	},
 

	add_new_item_for_money_convertor: function(dialog) {
		var me = this;

		var child = frappe.model.add_child(me.frm.doc, this.frm.doctype + " Item", "items");
		child.item_name = "Money Convertor"
		child.description ="converted money"
		child.qty = 1;
		child.rate = dialog.get_input('convert_to').val();


		frappe.after_ajax(function() {
			me.frm.script_manager.trigger("qty", child.doctype, child.name);
		})
	},

	get_exchange_rate: function(from_currency, to_currency, callback) {
		return frappe.call({
			method: "erpnext.setup.utils.get_exchange_rate",
			args: {
				from_currency: from_currency,
				to_currency: to_currency
			},
			callback: function(r) {
				callback(flt(r.message));
			}
		});
	},
	make_refresh: function() {
		var me = this;
		parent = this.wrapper.find(".refresh-area")
		refresh_btn = cur_frm.add_custom_button(__("Refresh"), function(){
			cur_frm.pos.refresh();
		}, "icon-refresh");
		$(parent).append($(refresh_btn))
		 
	},

	make_expense_entry: function(){
		var me = this;
		

		if (this.frm.doctype == 'Sales Invoice'){
			create_expense_btn = "<div class='btn-group actions-btn-group'>\
					<input type='button' name='Expense Entry' value='Expense Entry' class='btn btn-default btn-sm expense-entry'>\
				</div>" 
			this.expense_btn = $(create_expense_btn).appendTo($('.container').find('.row').find('.col-md-5.col-sm-4.col-xs-6.page-actions'));
			this.expense_btn .find('.expense-entry').on('click', function(){
				
				frappe.call({
					method: 'hardware_store.customization.rudy_purchase_order.get_expense_resons',
					args: {},
					callback: function(r) {
						var d = new frappe.ui.Dialog({
							title: __("Add New Expense Entry"),
							fields: [
								{"fieldtype":"HTML", "label":__("Expense Entry"), "reqd":1, "fieldname":"expense_entry"},
		                        {"fieldtype": "Section Break", "fieldname": "cb3"},
		                        {fieldtype:"Link", label:__("Expense Reason"), options:'Expense Reason', fieldname:"reason"},
		                        {"fieldtype": "Column Break", "fieldname": "cb"},
		                        {"fieldtype": "Data", "label": __("Description"), "fieldname": "description"},
		                        {"fieldtype": "Column Break", "fieldname": "cb1"},
		                        {"fieldtype": "Float", "label": __("Expense Amount"), "fieldname": "amount"},
		                        {"fieldtype": "Section Break", "fieldname": "cb1"},
		                        {"fieldtype": "Button", "label": __("Add"), "fieldname": "make_expense_entry"},
							]
						});
						d.show();
						if(r.message){
							$(d.body).find("[data-fieldname='expense_entry']").html(frappe.render_template("expense_template", {"data":r.message}))
						}
						$(d.body).find("button[data-fieldname='make_expense_entry']").on("click", function(){
							me.make_expense_entries(d);
						})
					}
				});


			})
		}
	},

	re_render_popup: function(){
		var me = this;
		if (this.frm.doctype == 'Sales Invoice'){	
			frappe.call({
				method: 'hardware_store.customization.rudy_purchase_order.get_expense_resons',
				args: {},
				callback: function(r) {
					if(r.message){
						var d = new frappe.ui.Dialog({
							title: __("Add New Expense Entry"),
							fields: [
								{"fieldtype":"HTML", "label":__("Expense Entry"), "reqd":1, "fieldname":"expense_entry"},
		                        {"fieldtype": "Section Break", "fieldname": "cb3"},
		                        {fieldtype:"Link", label:__("Expense Reason"), options:'Expense Reason', fieldname:"reason"},
		                        {"fieldtype": "Column Break", "fieldname": "cb"},
		                        {"fieldtype": "Data", "label": __("Description"), "fieldname": "description"},
		                        {"fieldtype": "Column Break", "fieldname": "cb1"},
		                        {"fieldtype": "Float", "label": __("Expense Amount"), "fieldname": "amount"},
		                        {"fieldtype": "Section Break", "fieldname": "cb1"},
		                        {"fieldtype": "Button", "label": __("Add"), "fieldname": "make_expense_entry"},
							]
						});
						d.show();
						$(d.body).find("[data-fieldname='expense_entry']").html(frappe.render_template("expense_template", {"data":r.message}))
						$(d.body).find("button[data-fieldname='make_expense_entry']").on("click", function(){
							me.make_expense_entries(d);
						})
					}	
				}
			});
		}
	},

	make_expense_entries: function(d){
		var me = this;
		exp_reason = $(cur_dialog.body).find("input[data-fieldname='reason']").val()
		exp_amount = $(cur_dialog.body).find("input[data-fieldname='amount']").val()
		exp_descrp = $(cur_dialog.body).find("input[data-fieldname='description']").val()
		if(exp_reason && exp_amount){
			frappe.call({
				method: 'hardware_store.customization.rudy_purchase_order.create_expense_entries',
				args: {
					"reason" : exp_reason,
					"amount" : exp_amount,
					"description": exp_descrp
				},
				freeze: true,
                freeze_message:"Expense Entry Creating...",
				callback: function(r) {
					if(r.message){
						d.hide();
						me.re_render_popup();
					}
				}
			});
		}
		else{
			frappe.throw("Please enter Expense Reason and Amount before make entry...")
		}
	},

// end of custom code
// end
	make_item_list: function() {
		var me = this;
		if(!this.price_list) {
			msgprint(__("Price List not found or disabled"));
			return;
		}

		// original code link
		// method: 'erpnext.accounts.doctype.sales_invoice.pos.get_items',

		me.item_timeout = null;
		frappe.call({
			
			method: 'hardware_store.customization.sales_invoice.get_items',
			args: {
				sales_or_purchase: this.sales_or_purchase,
				price_list: this.price_list,
				item: this.search.$input.val(),
				customer_group: this.frm.doc.customer_group || "Regular Customers"
			},
			callback: function(r) {
				var $wrap = me.wrapper.find(".item-list");
				me.wrapper.find(".item-list").empty();
				if (r.message) {
					if (r.message.length === 1) {
						var item = r.message[0];
						if (item.serial_no) {
							me.add_to_cart(item.item_code, item.serial_no);
							me.search.$input.val("");
							return;

						} else if (item.barcode) {
							me.add_to_cart(item.item_code);
							me.search.$input.val("");
							return;
						}
					}
				
					$.each(r.message, function(index, obj) {
						$(frappe.render_template("pos_item", {
							item_code: obj.name,
							item_price: obj.price_list_rate,
							item_name: obj.name===obj.item_name ? "" : obj.item_name,
							item_image: obj.image ? "url('" + obj.image + "')" : null
						})).tooltip().appendTo($wrap);
					});
				}

				// $.each(r.message, function(index, obj) {
				// 		$(frappe.render_template("pos_item", {
				// 			item_code: obj.name,
				// 			item_price: format_currency(obj.price_list_rate, obj.currency),
				// 			item_name: obj.name===obj.item_name ? "" : obj.item_name,
				// 			item_image: obj.image ? "url('" + obj.image + "')" : null
				// 		})).tooltip().appendTo($wrap);
				// 	});
				// }
				// if form is local then allow this function
				$(me.wrapper).find("div.pos-item").on("click", function() {
					if(me.frm.doc.docstatus==0) {
						counter = me.frm.doc.counter + 1
						me.add_to_cart($(this).attr("data-item-code"),false, counter);
					}
				});
			}
		});
	},
	add_to_cart: function(item_code, serial_no, counter) {
		var me = this;
		var caught = false;

		if(!me.frm.doc[me.party.toLowerCase()] && ((me.frm.doctype == "Quotation" &&
				me.frm.doc.quotation_to == "Customer")
				|| me.frm.doctype != "Quotation")) {
			msgprint(__("Please select {0} first.", [me.party]));
			return;
		}

		// get no_of_items
		var no_of_items = me.wrapper.find(".pos-bill-item").length;

		// check whether the item is already added
			// if (no_of_items != 0) {
			// 	$.each(this.frm.doc["items"] || [], function(i, d) {
			// 		if (d.item_code == item_code) {
			// 			caught = true;
			// 			if (serial_no)
			// 				frappe.model.set_value(d.doctype, d.name, "serial_no", d.serial_no + '\n' + serial_no);
			// 			else
			// 				frappe.model.set_value(d.doctype, d.name, "qty_in_uom", d.qty_in_uom + 1);

			// 			// set the uom
			// 			$(me.wrapper).find("[data-item-code='"+ d.item_code +"']")
			// 			.find("select.uom-conversion")
			// 			.val(d.uom)
			// 		}
			// 	});
			// }

		// if item not found then add new item
		// if (!caught)
			this.add_new_item_to_grid(item_code, serial_no, counter);

		this.refresh();
		this.refresh_search_box();
	},
	add_new_item_to_grid: function(item_code, serial_no, counter) {
		var me = this;
		var child = frappe.model.add_child(me.frm.doc, this.frm.doctype + " Item", "items");
		child.item_code = item_code;
		child.qty_in_uom = 1;

		if (serial_no)
			child.serial_no = serial_no;

		this.frm.script_manager.trigger("item_code", child.doctype, child.name);

		frappe.after_ajax(function() {
			me.frm.script_manager.trigger("qty_in_uom", child.doctype, child.name);
		})
	},
	refresh_search_box: function() {
		var me = this;

		// Clear Item Box and remake item list
		if (this.search.$input.val()) {
			this.search.set_input("");
			this.make_item_list();
		}
	},
	update_qty: function(item_code, qty, counter) {
		var me = this;
		$.each(this.frm.doc["items"] || [], function(i, d) {
			if (d.item_code == item_code && d.item_counter == counter) {
				if (qty == 0) {
					frappe.model.clear_doc(d.doctype, d.name);
					me.refresh_grid();
				} else {
					frappe.model.set_value(d.doctype, d.name, "qty_in_uom", qty);
				}
			}
		});
		this.refresh();
	},
	refresh: function() {
		var me = this;

		this.refresh_item_list();
		this.refresh_fields();
		// this.make_expense_entry();

		// if form is local then only run all these functions
		if (this.frm.doc.docstatus===0) {
			this.call_when_local();
		}

		this.disable_text_box_and_button();
		this.set_primary_action();

		// If quotation to is not Customer then remove party
		if (this.frm.doctype == "Quotation" && this.frm.doc.quotation_to!="Customer") {
			this.party_field.$input.prop("disabled", true);
		}
	},
	refresh_fields: function() {
		this.party_field.set_input(this.frm.doc[this.party.toLowerCase()]);
		this.party_field.frm = this.frm;
		this.party_field.doctype = this.frm.doctype;
		this.party_field.docname = this.frm.docname;

		this.wrapper.find('input.discount-percentage').val(this.frm.doc.additional_discount_percentage);
		this.wrapper.find('input.discount-amount').val(this.frm.doc.discount_amount);

		this.show_items_in_item_cart();
		this.show_taxes();
		this.set_totals();
		//this.set_usd_total();
		this.hide_quotation_area();

	},
	hide_quotation_area: function(){
		if(cur_frm.doc.doctype == "Quotation" ){
			this.wrapper.find(".quotation-area").find(".btn.btn-default").toggleClass("hide", this.frm.doc.__islocal ==1 || this.frm.doc.status == "Lost");
		}
			
	},

	refresh_item_list: function() {
		var me = this;
		// refresh item list on change of price list
		if (this.frm.doc[this.price_list_field] != this.price_list) {
			this.price_list = this.frm.doc[this.price_list_field];
			this.make_item_list();
		}
	},
	show_items_in_item_cart: function() {
		var me = this;
		var $items = this.wrapper.find(".items").empty();

		$.each(this.frm.doc.items|| [], function(i, d) {
			$(frappe.render_template("pos_bill_item", {
				uom: d.uom,
				item_code: d.item_code,
				uoms: JSON.parse(d.uoms? d.uoms: "[]"),
				item_name: (d.item_name===d.item_code || !d.item_name) ? "" : ("<br>" + d.item_name),
				qty: d.qty_in_uom,
				counter: d.item_counter,
				qty_item_uom: d.qty,
				actual_qty: d.actual_qty,
				projected_qty: d.projected_qty,
				rate: format_currency(d.rate, me.frm.doc.currency),
				amount: format_currency(d.amount, me.frm.doc.currency)
			})).appendTo($items);
		});

		this.wrapper.find("input.pos-item-qty").on("focus", function() {
			$(this).select();
		});
	},
	show_taxes: function() {
		var me = this;
		var taxes = this.frm.doc["taxes"] || [];
		$(this.wrapper)
			.find(".tax-area").toggleClass("hide", (taxes && taxes.length) ? false : true)
			.find(".tax-table").empty();

		$.each(taxes, function(i, d) {
			if (d.tax_amount) {
				$(frappe.render_template("pos_tax_row", {
					description: d.description,
					tax_amount: format_currency(flt(d.tax_amount)/flt(me.frm.doc.conversion_rate),
						me.frm.doc.currency)
				})).appendTo(me.wrapper.find(".tax-table"));
			}
		});
	},
	set_usd_total: function(){
		data = this.frm.doc['grand_total']
		cur_frm.set_value("grand_total_usd", this.frm.doc['grand_total'])
		frappe.model.set_value(this.frm.doc.doctype, this.frm.doc.docname, "grand_total_usd", data);
	},

	set_totals: function() {
		var me = this;
		data = format_currency(me.frm.doc["base_total"], get_currency_symbol())
		this.wrapper.find(".net-total").text(format_currency(me.frm.doc["net_total"], me.frm.doc.currency));
		this.wrapper.find(".net-total1").text(format_currency(me.frm.doc["base_net_total"], "G"));
		this.wrapper.find(".grand-total").text(format_currency(me.frm.doc.grand_total, me.frm.doc.currency));
		this.wrapper.find(".grand-total1").text(format_currency(me.frm.doc['base_net_total'], "G"));
	},
	call_when_local: function() {
		var me = this;

		// append quantity to the respective item after change from input box
		$(this.wrapper).find("input.pos-item-qty").on("change", function() {
			var item_code = $(this).parents(".pos-bill-item").attr("data-item-code");
			var counter= $(this).parents(".pos-bill-item").attr("data-item-counte")
			me.update_qty(item_code, $(this).val(), counter);
		});

		// increase/decrease qty on plus/minus button
		$(this.wrapper).find(".pos-qty-btn").on("click", function() {
			var $item = $(this).parents(".pos-bill-item:first");
			me.increase_decrease_qty($item, $(this).attr("data-action"));
		});

		$(this.wrapper).find(".uom-conversion").on("change", function() {
			var item_code = $(this).parents(".pos-bill-item").attr("data-item-code");
			var counter = $(this).parents(".pos-bill-item").attr("data-item-counter")
			me.change_uom(item_code, $(this).val(), counter);
		});

		this.focus();
	},
	focus: function() {
		if(this.frm.doc[this.party.toLowerCase()]) {
			this.search.$input.focus();
		} else {
			if(!(this.frm.doctype == "Quotation" && this.frm.doc.quotation_to!="Customer"))
				this.party_field.$input.focus();
		}
	},
	increase_decrease_qty: function($item, operation) {
		var me = this;
		var item_code = $item.attr("data-item-code");
		var counter = $item.attr("data-item-counter")
		var item_qty = cint($item.find("input.pos-item-qty").val());
	
		// original code
			// if (operation == "increase-qty")
			// 	this.update_qty(item_code, item_qty + 1);
			// else if (operation == "decrease-qty" && item_qty != 0)
			// 	this.update_qty(item_code, item_qty - 1);
		// end 
		if (operation == "increase-qty"){
			this.update_qty(item_code, item_qty + 1, parseInt(counter));
		}
		else {
			if (operation == "decrease-qty" && item_qty != 0){
				this.update_qty(item_code, item_qty - 1, parseInt(counter));
			}else if(item_qty == 0) {
				$.each(cur_frm.doc["items"] || [], function(i, d) {
					if (d.item_name == "Money Convertor")	{
						frappe.model.clear_doc(d.doctype, d.name);
						me.refresh_grid();
					}
				});
			}
		}
	},
	disable_text_box_and_button: function() {
		var me = this;
		// if form is submitted & cancelled then disable all input box & buttons
		$(this.wrapper)
			.find(".pos-qty-btn")
			.toggle(this.frm.doc.docstatus===0);

		$(this.wrapper).find('input, button').prop("disabled", !(this.frm.doc.docstatus===0));
		$(this.wrapper).find(".uom-conversion").prop("disabled",!(this.frm.doc.docstatus===0)) 
		if(this.frm.doc.doctype =="Quotation"){
			$(this.wrapper).find(".quotation-area").find('input, button').prop("disabled", false, !(this.frm.doc.docstatus===0));
		}

		// this.wrapper.find(".pos-item-area").toggleClass("hide", me.frm.doc.docstatus!==0);

	},
	set_primary_action: function() {
		var me = this;
		if (this.frm.page.current_view_name==="main") return;

		if (this.frm.doctype == "Sales Invoice" && this.frm.doc.docstatus===0) {
			if (!this.frm.doc.is_pos) {
				this.frm.set_value("is_pos", 1);
			}
			this.frm.page.set_primary_action(__("Pay"), function() {
				me.make_payment();
			});
		} else if (this.frm.doc.docstatus===1 && !(frappe.get_cookie("user_id") == "Administrator") && !inList(user_roles,"Cashier") && this.frm.doctype == "Quotation" ) {
			this.frm.page.set_primary_action(__("New"), function() {
				erpnext.open_as_pos = true;
				new_doc(me.frm.doctype);
			});
		} else if (this.frm.doc.docstatus===1 && this.frm.doctype == "Sales Invoice") {
			this.frm.page.set_primary_action(__("New"), function() {
				erpnext.open_as_pos = true;
				new_doc(me.frm.doctype);
			});
		} 
	},
	refresh_delete_btn: function() {
		$(this.wrapper).find(".remove-items").toggle($(".item-cart .warning").length ? true : false);
	},
	remove_selected_items: function() {
		var me = this;
		var selected_items = [];
		var no_of_items = $(this.wrapper).find("#cart tbody tr").length;
		for(var x=0; x<=no_of_items - 1; x++) {
			var row = $(this.wrapper).find("#cart tbody tr:eq(" + x + ")");
			if(row.attr("data-selected") == "true") {
				selected_items.push(row.attr("id"));
			}
		}

		var child = this.frm.doc["items"] || [];

		$.each(child, function(i, d) {
			for (var i in selected_items) {
				if (d.item_code == selected_items[i]) {
					frappe.model.clear_doc(d.doctype, d.name);
				}
			}
		});

		this.refresh_grid();
	},
	refresh_grid: function() {
		this.frm.dirty();
		this.frm.fields_dict["items"].grid.refresh();
		this.frm.script_manager.trigger("calculate_taxes_and_totals");
		this.refresh();
	},
	with_modes_of_payment: function(callback) {
		var me = this;
		if(me.modes_of_payment) {
			callback();
		} else {
			me.modes_of_payment = [];
			$.ajax("/api/resource/Mode of Payment").success(function(data) {
				if(!(frappe.get_cookie("user_id") == "Administrator") && inList(user_roles,"Cashier")) {
					$.each(data.data, function(i, d) { if (d.name == "Cash"){me.modes_of_payment.push(d.name);} });
				}else{
					$.each(data.data, function(i, d) { if (d.name != "Bank Draft" && d.name != "Credit Card" && d.name != "Wire Transfer"){me.modes_of_payment.push(d.name);} });				
				}
				callback();
			});
		}

		// var me = this;
		// 	me.modes_of_payment = [];
		// 	$.ajax("/api/resource/Mode of Payment").success(function(data) {
				// if(!(frappe.get_cookie("user_id") == "Administrator") && inList(user_roles,"Cashier") && ($("body").find("input[data-fieldname='customer']").val() == "Convert Money Customer") ){
				// 	$.each(data.data, function(i, d) { if (d.name == "Cash"){me.modes_of_payment.push(d.name);} });
				// }else{
				// 	$.each(data.data, function(i, d) { if (d.name != "Bank Draft" && d.name != "Credit Card" && d.name != "Wire Transfer"){me.modes_of_payment.push(d.name);} });				
				// }
		// 		callback();
		// 	});
	},
	make_payment: function() {
		var me = this;
		var no_of_items = this.frm.doc.items.length;
		var custom_currency_type = ["USD", "HTD"]
		if (no_of_items == 0)
			msgprint(__("Payment cannot be made for empty cart"));
		else {

			this.with_modes_of_payment(function() {
				// prefer cash payment!
			var default_mode = me.frm.doc.mode_of_payment ? me.frm.doc.mode_of_payment :
				me.modes_of_payment.indexOf(__("Cash"))!==-1 ? __("Cash") : undefined;

			var type = custom_currency_type ? custom_currency_type :
				custom_currency_type.indexOf(__("HTD"))!==-1 ? __("HTD") : undefined;

			var usd_exchange_rate = 0
			var htd_exchange_rate = 0
			frappe.call({
					method : "hardware_store.hardware_store.doctype.configuration.configuration.currency_data",
					callback:function(r) {
						if(r.message){
							$(dialog.body).find("[data-fieldname='currency_exchange_list']").html(frappe.render_template("currency_exchange_rate_template", {"data":r.message}))
							for (var i =0 ; i< r.message.length ; i++){
								if(r.message[i].name =="USD-HTD" ){
									usd_exchange_rate = r.message[i]['exchange_rate']

								}
								if(r.message[i].name == "HTD-HTG"){
									htd_exchange_rate = r.message[i]['exchange_rate']
								}
							}
						}
					}
				})
				// show payment wizard
				var dialog = new frappe.ui.Dialog({
					width: 400,
					title: 'Payment',
					fields: [
						{fieldtype:'Currency',
							fieldname:'total_amount', label: __( get_currency_symbol() + " " +' Amount'), 
							"default": me.frm.doc.grand_total},
						{fieldtype:'Currency',
							fieldname:'total_amount_G', label: __('Total HTG'),
							"default": me.frm.doc.base_net_total},
						{fieldtype:'Select', fieldname:'mode_of_payment',
							label: __('Mode of Payment'),
							options: me.modes_of_payment.join('\n'), reqd: 1,
							"default": default_mode},
						{fieldtype:'Select', fieldname:'currency_type',
							label: __('Pay Value'),
							options: custom_currency_type.join('\n')},
						{fieldtype:'Currency', fieldname:'paid_amount', label:__('Paid HTD'),
							reqd:1, "default": me.frm.doc.grand_total,
							change: function() {
								var values = dialog.get_values();

								var actual_change = flt(values.paid_amount - values.total_amount,
									precision("paid_amount"));

								if (actual_change > 0) {
									var rounded_change =
										round_based_on_smallest_currency_fraction(actual_change,
											me.frm.doc.currency, precision("paid_amount"));
								} else {
									var rounded_change = 0;
								}

								dialog.set_value("change", actual_change);

								me.frm.set_value("cash_paid_amount_htd", values.paid_amount);
								me.frm.set_value("change_amount_returned_htd", actual_change);

								if (usd_exchange_rate && htd_exchange_rate){
									dialog.set_value("change_to_htg", actual_change * htd_exchange_rate);
								}
								dialog.get_input("change").trigger("change");
								dialog.get_input("change_to_htg").trigger("change");

								// dialog.set_value("change", rounded_change);

								// me.frm.set_value("cash_paid_amount_htd", values.paid_amount);
								// me.frm.set_value("change_amount_returned_htd", rounded_change);

								// if (usd_exchange_rate && htd_exchange_rate){
								// 	dialog.set_value("change_to_htg", rounded_change * htd_exchange_rate);
								// }

							}},
						{fieldtype:'Currency', fieldname:'paid_amount_to_usd', label: __('Paid USD'),
							"default": 0.0, hidden: 1, change: function() {

								var values = dialog.get_values();
								if (usd_exchange_rate && htd_exchange_rate){
								// var write_off_amount = (flt(values.paid_amount) - flt(values.change)) - values.total_amount;
									dialog.set_value("paid_amount",values.paid_amount_to_usd * usd_exchange_rate);

								var actual_changes = flt(values.paid_amount_to_usd * usd_exchange_rate - values.total_amount,
									precision("paid_amount"));
								dialog.set_value("change", actual_changes);
								dialog.set_value("change_to_htg", actual_changes * htd_exchange_rate);
								}
							}
						},
						{fieldtype:'Currency', fieldname:'change', label: __('Change HTD'),
							"default": 0.0, hidden: 1, change: function() {
								var values = dialog.get_values();
								var write_off_amount = (flt(values.paid_amount) - flt(values.change)) - values.total_amount;
								dialog.get_field("write_off_amount").toggle(write_off_amount);
								dialog.set_value("write_off_amount", write_off_amount);
							}
						},
						{fieldtype:'Currency', fieldname:'change_to_htg', label: __('Change HTG'),
							"default": 0.0, hidden: 1, change: function() {
							}
						},
						{fieldtype:'Currency', fieldname:'write_off_amount',
							label: __('Write Off'), "default": 0.0, hidden: 1},
					]
				});
				me.dialog = dialog;
				dialog.show();

				dialog.set_value("currency_type", "HTD");
				// make read only
				dialog.get_input("total_amount").prop("disabled", true);
				dialog.get_input("total_amount_G").prop("disabled", true);
				dialog.get_input("write_off_amount").prop("disabled", true);
			
				// toggle amount paid and change
				dialog.get_input("mode_of_payment").on("change", function() {
					var is_cash = dialog.get_value("mode_of_payment") === __("Cash");
					dialog.get_field("paid_amount").toggle(is_cash);
					dialog.get_field("change").toggle(is_cash);
					dialog.get_field("paid_amount_to_usd").toggle(is_cash);
					dialog.get_field("currency_type").toggle(is_cash);
					dialog.get_field("change_to_htg").toggle(is_cash)
					// original code for reference

					if (is_cash && !dialog.get_value("change")) {
						// set to nearest 5
						dialog.set_value("paid_amount", dialog.get_value("total_amount"));
						dialog.get_input("paid_amount").trigger("change");
					} else if (!is_cash) {
						dialog.set_value("paid_amount", dialog.get_value("total_amount"));
						dialog.set_value("change", 0);
						me.frm.set_value("cash_paid_amount_htd", 0);
						me.frm.set_value("change_amount_returned_htd", 0);
					}
					
					
				}).trigger("change");

				dialog.get_input("currency_type").on("change", function() {
					var is_usd = dialog.get_value("currency_type") === __("USD");
					dialog.get_field("paid_amount_to_usd").toggle(is_usd);
					// original code for reference

					if (is_usd ) {
						dialog.get_input("paid_amount").parent().parent().parent().parent().hide();
					} else if (!is_usd) {
						dialog.get_input("paid_amount").parent().parent().parent().parent().show();
						dialog.get_input("change").parent().parent().parent().parent().show();
						
					}
				}).trigger("change");



				me.set_pay_button(dialog);	
			});
		}
	},
	set_pay_button: function(dialog) {
		var me = this;
		dialog.set_primary_action(__("Pay"), function() {
			var values = dialog.get_values();
			var is_cash = values.mode_of_payment === __("Cash");
			if (!is_cash) {
				values.write_off_amount = values.change = 0.0;
				values.paid_amount = values.total_amount;
			}
			me.frm.set_value("mode_of_payment", values.mode_of_payment);

			var for_credit_account = values.mode_of_payment === __("Credit to account");
			if (!for_credit_account ){
			//custom added by for credit to account payment 
		
				var paid_amount = flt((flt(values.paid_amount) - flt(values.change)), precision("paid_amount"));
				
				me.frm.set_value("paid_amount", paid_amount);

				// specifying writeoff amount here itself, so as to avoid recursion issue
				me.frm.set_value("write_off_amount", me.frm.doc.grand_total - paid_amount);
				me.frm.set_value("outstanding_amount", 0);
			//custom code by arpit
			}else{
				me.frm.set_value("is_pos", 0);
				me.frm.set_value("paid_amount", 0);

				// specifying writeoff amount here itself, so as to avoid recursion issue
				me.frm.set_value("write_off_amount", 0);
				me.frm.set_value("outstanding_amount", paid_amount);

			}
			
			me.frm.savesubmit(this);
			dialog.hide();
			me.refresh();
		})

	},

	change_uom: function(item_code, uom, counter) {
		console.log(uom,"00000000000000")
		var me = this;
		$.each(this.frm.doc["items"] || [], function(i, d) {
			if (d.item_code == item_code && d.item_counter == counter) {
				frappe.model.set_value(d.doctype, d.name, "uom", uom);
				me.frm.script_manager.trigger("qty", d.doctype, d.name);
			}
		});
	}
});

erpnext.pos.make_pos_btn = function(frm) {
	frm.page.add_menu_item(__("{0} View", [frm.page.current_view_name === "pos" ? "Form" : "Point-of-Sale"]), function() {
		erpnext.pos.toggle(frm);
	});

	if(frm.pos_btn) return;

	// Show POS button only if it is enabled from features setup
	if (cint(sys_defaults.fs_pos_view)!==1 || frm.doctype==="Material Request") {
		return;
	}

	if(!frm.pos_btn) {
		frm.pos_btn = frm.page.add_action_icon("icon-th", function() {
			erpnext.pos.toggle(frm);
		});
	}

	if(erpnext.open_as_pos && frm.page.current_view_name !== "pos") {
		erpnext.pos.toggle(frm, true);
	}
}

erpnext.pos.toggle = function(frm, show) {
	// Check whether it is Selling or Buying cycle
	var price_list = frappe.meta.has_field(cur_frm.doc.doctype, "selling_price_list") ?
		frm.doc.selling_price_list : frm.doc.buying_price_list;

	if(show!==undefined) {
		if((show===true && frm.page.current_view_name === "pos")
			|| (show===false && frm.page.current_view_name === "main")) {
			return;
		}
	}

	if(frm.page.current_view_name!=="pos") {
		// before switching, ask for pos name
		if(!price_list) {
			frappe.throw(__("Please select Price List"));
		}

		if(!frm.doc.company) {
			frappe.throw(__("Please select Company"));
		}
	}

	// make pos
	if(!frm.pos) {
		var wrapper = frm.page.add_view("pos", "<div>");
		frm.pos = new erpnext.pos.PointOfSale(wrapper, frm);
	}

	// toggle view
	frm.page.set_view(frm.page.current_view_name==="pos" ? "main" : "pos");

	frm.toolbar.current_status = null;
	frm.refresh();

	// refresh
	if(frm.page.current_view_name==="pos") {
		frm.pos.refresh();
	}
}

function map_quotation_to_invoice () {
	frappe.model.map_current_doc({
						method: "hardware_store.customization.customization.make_sales_invoice",
						source_doctype: "Quotation",
						get_query_filters: {
							docstatus: 1,
							status: ["!=", "Lost"],
							order_type: cur_frm.doc.order_type,
							customer: cur_frm.doc.customer || undefined,
							company: cur_frm.doc.company
						}
					})
}