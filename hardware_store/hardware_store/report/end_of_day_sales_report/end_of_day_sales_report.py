# Copyright (c) 2013, Makarand Bauskar and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import flt, getdate, cstr
from frappe import _

def execute(filters=None):
	data = []
	columns = get_columns(filters)
	res = get_result(filters)
	return columns, data


def get_columns(filters):
	columns = [
		_("Parameter") + ":Date:90"
	]

	# if filters.get("show_in_account_currency"):
	columns += [
		_("HTD currency") + ":Float:100",
		_("HTG currency") + ":Float:100"
	]
	columns += [
		_("Mode Of payment") + "::120"
	]
	return columns

# def get_result(filters):
# 	gl_entries = get_gl_entries(filters)

# 	data = get_data_with_opening_closing(filters, account_details, gl_entries)

# 	result = get_result_as_list(data, filters)

# 	return result


# def get_gl_entries(filters):
# 	select_fields = """, sum(debit_in_account_currency) as debit_in_account_currency,
# 		sum(credit_in_account_currency) as credit_in_account_currency""" \
# 		if filters.get("show_in_account_currency") else ""

# 	group_by_condition = "group by voucher_type, voucher_no, account, cost_center" \
# 		if filters.get("group_by_voucher") else "group by name"

# 	gl_entries = frappe.db.sql("""select posting_date, account, party_type, party,
# 			sum(debit) as debit, sum(credit) as credit,
# 			voucher_type, voucher_no, cost_center, remarks, against, is_opening {select_fields}
# 		from `tabGL Entry`
# 		where company=%(company)s {conditions}
# 		{group_by_condition}
# 		order by posting_date, account"""\
# 		.format(select_fields=select_fields, conditions=get_conditions(filters),
# 			group_by_condition=group_by_condition), filters, as_dict=1)

# 	query = """Select """
# 	eod_report = frappe.db.sql(query,as_dict=1)
# 	return gl_entries