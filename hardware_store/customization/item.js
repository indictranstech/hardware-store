frappe.ui.form.on("Item","onload",function(frm){	
	if(frm.doc.__islocal){
		for(var i=0; i<4; i++){
			frappe.model.add_child(frm.doc, "Credit Customers", "credit_customers_price_list")
			frappe.model.add_child(frm.doc, "Reseller Customers", "reseller_customers_price_list")
			frappe.model.add_child(frm.doc, "Regular Customers", "regular_customers_price_list")
		}
		
	}	
})

