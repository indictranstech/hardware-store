frappe.ui.form.on("Item","onload",function(frm){	
	if(frm.doc.__islocal){
		for(var i=0; i<4; i++){
			frappe.model.add_child(frm.doc, "Credit Customers", "credit_customers_price_list")
			frappe.model.add_child(frm.doc, "Reseller Customers", "reseller_customers_price_list")
			frappe.model.add_child(frm.doc, "Regular Customers", "regular_customers_price_list")
		}
		
	}	
})

cur_frm.fields_dict.credit_customers_price_list.grid.get_field("uom_quantity").get_query = function(doc) {
	var t_list = []
	uom_list(t_list);
	
	return {
		filters: [
			['UOM', 'name', 'in', t_list]
		]
	}	
},

cur_frm.fields_dict.regular_customers_price_list.grid.get_field("uom_quantity").get_query = function(doc) {
	var t_list = []
	uom_list(t_list);
	
	return {
		filters: [
			['UOM', 'name', 'in', t_list]
		]
	}

},

cur_frm.fields_dict.reseller_customers_price_list.grid.get_field("uom_quantity").get_query = function(doc) {
	var t_list = []
	uom_list(t_list);
	return {
		filters: [
			['UOM', 'name', 'in', t_list]
		]
	}
	
}

function uom_list (t_list) {
	if(cur_frm.doc.uoms){
			for(var i = 0 ; i < cur_frm.doc.uoms.length ; i++){
				if(cur_frm.doc.uoms[i].uom){
					t_list.push(cur_frm.doc.uoms[i].uom);
				}
			}
	}
	// body...
}