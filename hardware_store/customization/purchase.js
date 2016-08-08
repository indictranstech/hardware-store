frappe.ui.form.on("Purchase Invoice","onload",function(doc, dt, dn){
	cur_frm.set_value("currency","USD")
	// cur_frm.set_value("conversion_rate","355")
})

frappe.ui.form.on("Purchase Receipt","onload",function(doc, dt, dn){
	cur_frm.set_value("currency","USD")
	// cur_frm.set_value("conversion_rate","355")
})