# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "hardware_store"
app_title = "Hardware Store"
app_publisher = "Makarand Bauskar"
app_description = "Hardware Store"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "makarand.b@indictranstech.com"
app_license = "MIT"

# Includes in <head>
# ------------------
app_include_js = "assets/js/hardware_store.min.js"
app_include_css = "/assets/css/hardware_rudy_store.css"


# include js, css files in header of desk.html
# app_include_css = "/assets/hardware_store/css/hardware_store.css"
# app_include_js = "/assets/hardware_store/js/hardware_store.js"

# include js, css files in header of web template
# web_include_css = "/assets/hardware_store/css/hardware_store.css"
# web_include_js = "/assets/hardware_store/js/hardware_store.js"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "hardware_store.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "hardware_store.install.before_install"
# after_install = "hardware_store.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "hardware_store.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }
doc_events = {
	"Sales Invoice": {
		"before_insert": "hardware_store.customization.sales_invoice.custom_for_pos"
	}
}


# Scheduled Tasks
# ---------------

scheduler_events = {
	"hourly": [
		"hardware_store.hardware_store.doctype.configuration.configuration.quotation_status"
	]
	# ,
	# "daily": [
	# 	"hardware_store.hardware_store.doctype.configuration.configuration.quotation_status"
	# ]
}


# scheduler_events = {
	# "all": [
	# 	"hardware_store.hardware_store.configuration.configuration.quotation_status"
	# ],
# 	"daily": [
# 		"hardware_store.tasks.daily"
# 	],
# 	"weekly": [
# 		"hardware_store.tasks.weekly"
# 	]
# 	"monthly": [
# 		"hardware_store.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "hardware_store.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "hardware_store.event.get_events"
# }

fixtures= ['Custom Script','Property Setter','Custom Field','Currency','Customer Group','Role','Mode of Payment','Print Format']