# CEEO-Inventory-Proejct

BY: Bianca Capretta 
DATE: August 10th, 2016 
PURPOSE: to keep track of all the items in Ethan Danahy's office at the CEEO

## How It Works

Given your ID, an item with a barcode, and it's return date, you can scan the item 
and the system will either recognize you and take not of what you checked out, or 
add you to the system given a little bit more information. It keeps a list of all
the users in the database. The system will know when you're checking an item back in, too 
(you don't need your ID). 

The Enter Form will autofill most of the information if it recgonizes you; 
all the information is locked and cannot be edited (unless it is an input box). There 
is a form for reporting broken/missing items; you can search the inventory to 
find specific items; and you can add items to the inventory. The system will 
email you confirming a check-out, when you have a week left to return, 
and the day before it's due. Along with keeping a real-time inventory of all the items,
there also exists a page that will tell you all the relevant info about any item 
(who checked it out last, when it was last checked out, if it is checked out, etc).

This spreadsheet was created using Google Spreadsheet's tool, Script Editor.
Check it out here: https://docs.google.com/spreadsheets/d/1q74d5TzMP8CcIpwsuiDnNBASyI1cfZQ8WzAVWHrKMdQ/edit?usp=sharing 

## Google Spreadsheet References
- Excel Spreadsheet: https://docs.google.com/spreadsheets/d/19Tc7gYlGciGQ8W0jpXmDEEjONIRjiABKlkTXbhdVNns/edit#gid=0
- Google Apps Script: https://developers.google.com/apps-script/guides/sheets/functions#autocomplete
- Time Driven Triggers: https://developers.google.com/apps-script/guides/triggers/installable#time-driven_triggers
