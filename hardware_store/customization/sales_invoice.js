frappe.ui.form.on("Sales Invoice Item","qty",function(doc, cdt, cdn){

	cur_doc = cur_frm.doc
	customer_group = cur_doc.customer_group
	var item = locals[cdt][cdn];
	
	if(customer_group == "Regular Customers" && cur_doc.customer != "Convert Money Customer"){
		console.log("inside if")
		get_rate_from_item(item, customer_group)
	}
	else if(customer_group == "Credit Customers" && cur_doc.customer != "Convert Money Customer"){
		console.log("inside if-----")
		get_rate_from_item(item, customer_group)
	}
	else if(customer_group == "Reseller Customers" && cur_doc.customer != "Convert Money Customer"){
		console.log("inside if000000000000")
		get_rate_from_item(item, customer_group)
	}
	
})

function get_rate_from_item (item, customer_group) {
	console.log("check calling")
	args ={}
	args['item_name'] = item.item_code || item.item_name
	args['qty'] = item.qty
	args['customer_group'] = customer_group
	args['item_uom'] = item.uom || " "
	return frappe.call({
		method : "hardware_store.customization.quotation.rate",
		args : { args },
		callback:function(r){
			if(r.message) {
				item.rate =r.message[0]['rate']
				console.log(item.rate,"lllllllllll")
				cur_frm.refresh_fields();
			}
		}
	})
}

 frappe.ui.form.on("Sales Invoice","onload",function(doc, cdt, cdn){
 	var me = this;
 	if (cint(frappe.defaults.get_user_defaults("fs_pos_view"))===1)
						erpnext.pos.toggle(cur_frm, true);
	// frappe.route_history[frappe.route_history.length -1][1]
	// frappe.get_prev_route()
	
	if(cur_frm.doc.__islocal && frappe.get_prev_route() && (frappe.get_prev_route()[1] != 'Quotation' ) && cur_frm.doc.docstatus == 0){
		frappe.call({
	 		method : "hardware_store.customization.customization.default_customer",
	 		callback:function(r) {
	 			if(r.message){
	 				cur_frm.set_value("customer",r.message[0]['name'])
	 			}
	 		}
	 	})
 	}
	
 })

 // frappe.ui.form.on("Sales Invoice","")

frappe.ui.form.on("Sales Invoice Item", {
	item_code: function(doc, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		return frappe.call({
			method: "hardware_store.customization.item.get_item_uom",
			args: {
				item_code: item.item_code
			},
			callback(r) {
				item.item_counter = cur_frm.doc.counter + 1
				cur_frm.set_value('counter', item.item_counter)
				console.log(item.item_counter)
				console.log(cur_frm.doc.counter)
				console.log('\n')
				item.uoms = r.message;
				cur_frm.refresh_fields();
			}
		})
	},

	uom: function(doc, cdt, cdn) {
		var item = frappe.get_doc(cdt, cdn);
		if(item.item_code && item.uom) {
			return cur_frm.call({
				method: "erpnext.stock.get_item_details.get_conversion_factor",
				child: item,
				args: {
					item_code: item.item_code,
					uom: item.uom
				},
				callback: function(r) {
					if(!r.exc) {
						console.log(JSON.stringify(r.message));
						custom_conversion_factor(cur_frm.doc, cdt, cdn);
						// get_rate_from_item(item, cur_doc.customer_group)
						cur_frm.script_manager.trigger("qty", cdt, cdn);	
						// console.log("---------------inside uom------------")
					}
				}
			});
		}
	},

	qty_in_uom: function(doc, cdt, cdn) {
		custom_conversion_factor(doc, cdt, cdn)
		cur_frm.script_manager.trigger("qty", cdt, cdn);
		cur_frm.refresh_fields()
		// console.log("-----------inside qty_in_uom------------")
	},

	conversion_factor: function(doc, cdt, cdn) {
		custom_conversion_factor(doc, cdt, cdn)
		cur_frm.refresh_fields()
		// console.log("-----inside conversion factor")
	},
});

custom_conversion_factor = function(doc, cdt, cdn) {
	if(frappe.meta.get_docfield(cdt, "qty_in_uom", cdn)) {
		var item = frappe.get_doc(cdt, cdn);
		frappe.model.round_floats_in(item, ["qty_in_uom", "conversion_factor"]);
		item.qty = flt(item.qty_in_uom * item.conversion_factor, precision("qty_in_uom", item));
		// console.log(item.qty);
		// console.log("custom conversion factor------------------")
	}
}

cur_frm.fields_dict['mode_of_payment'].get_query = function(){ 
	var t_list = ['Cash','Credit to account', 'Bank Deposit', 'Cheque']; return {
		filters: [
			['Mode of Payment', 'name', 'in', t_list]
		]
	}}