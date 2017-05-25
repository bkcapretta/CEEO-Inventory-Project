// Inventory Spreadsheet System
// Purpose: to control and know where the items are in Ethan Danahy's office.
//    Uses Google Spreadsheet's powerful tool, the Script Editor (seen in Tools
//    tab)
// By: Bianca Capretta
// Date: August 10th, 2016

// purp: to save information of a new user and add it to the user database 
function save(id) {
  // get the sheets
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var database = SpreadsheetApp.getActive().getSheetByName('User Database');
  
  // collect new info
  var itemID = form.getRange('C2').getDisplayValue();
  var newFirst = form.getRange('D6').getDisplayValue();
  var newLast = form.getRange('D7').getDisplayValue();
  var newEmail = form.getRange('D8').getDisplayValue();
  var isNew = true;
   
  // get a 2D array of all info in the database sheet
  var values = database.getRange(1, 1, database.getLastRow(), database.getLastColumn()).getDisplayValues();
  
  // goes through User Database to make sure email isn't already used 
  for (var i=0; i<values.length; i++) {
    if (values[i][3] == newEmail) {
      isNew = false;
      form.getRange('D9').setValue('ERROR: That email has already been used.');
    }
  }
  
  // if all input was entered correctly w/ a new user ID, add to  database. If not, put up signal
  if (isNew == true && newFirst != '' && newLast != '' && newEmail != '') {
    database.appendRow([id, newFirst, newLast, newEmail]);
    Logger.log('Successfully saved user email');
  }
  else if (isNew == true) {
    form.getRange('D9').setValue('ERROR: You did not fill out all fields.');
  }
}

// purp: to take user's entered info and put into Check In/Check Out
//       if not all info is correct, send appropriate error message
function submit() {
  // get sheets
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var checkIn = SpreadsheetApp.getActive().getSheetByName('Check In');
  var database = SpreadsheetApp.getActive().getSheetByName('User Database');
  
  // make "Thank You" text pop up assuming nothing has gone wrong (yet)
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  form.getRange('D9').setValue('Thank you!');
  
  // get all user info
  var itemID = form.getRange('C2').getDisplayValue();
  var item = inventory(itemID);
  var where = inOrOut(itemID);
  var returnDate;
  var id;
  
  // gets return date depending on item check in or out & gets ID depending where it is
  if (where == 'In') {
    returnDate = new Date(); // if item is checked in, return date is today
    id = itemToID(itemID); // gets the user's ID who checked it out (go into user database)
  }
  else if (where == 'Out') {
    // get info on form
    returnDate = form.getRange('C4').getDisplayValue();
    id = form.getRange('C3').getDisplayValue();
    
    // only save if someone is checking out with a new user ID
    if (inSystem(id) == 'ID NOT FOUND! Please enter information below') {
      save(id);
    }
  }
  
  // don't let user submit if item is not entered/nonexistent
  if (itemID == '' || item == 'Not found in our system') {  
    form.getRange('D9').setValue('ERROR: Proper information not entered');
  }
  // don't let user submit if any fields are empty
  else if (id == '' || returnDate == '') {
    form.getRange('D9').setValue('ERROR: You did not fill out all fields.');
  }
  // checks if item is a kit and if not complete
  else if (isComplete(itemID) != '') {
    form.getRange('D9').setValue('ERROR: Not all of the kit is returned.');
  }
  // if everything has been entered appropriately, go forward with submitting everything
  else {  
    var name = IDtoUser(id); // returns user's full name
    var timestamp = new Date();
    var newReturnDate;
    var string = '';
    
    // puts info into Check Out form
    if (id > 0 && where == 'Out' && checkOut != null) {
      // takes care of entered date, whether it's a word (such as, "a week") or a real date (6/5/16)
      newReturnDate = adjustReturn(returnDate);
      checkOut.appendRow([id, name, itemID, item, newReturnDate, timestamp, 'no']);
      
      // check to see if item is a kit
      if (itemID[0] == '2') {
        // individual parts in kit are checked out
        multipleCheckOut(id, name, itemID, newReturnDate, timestamp);
      }
      
      // sends check out email
      sendEmail(itemID, id, newReturnDate, where);
      countItem(itemID); // updates number of time item has been checked out (stored in Check Out sheet)
    }
    
    // puts info into Check In form
    else if (id > 0 && where == 'In' && checkIn != null) {
      checkIn.appendRow([id, name, itemID, item, timestamp]);
      
      if (itemID[0] == 2) {
        // individual parts in kit are checked in
        multipleCheckIn(id, name, itemID, timestamp);
      }
      
      triggerYes(itemID); // go into check out form to report this item has been returned
      sendEmail(itemID, id, newReturnDate, where);
    }
  }
  
  // clears main page of information, ready for next user
  reset();
}

// purp: to clear content on enter form, make Enter Form the active sheet, and place cursor at the top
function reset() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  sheet.getRange('C2:C4').clearContent(); // gets rid of item's ID, user ID, and return date
  sheet.getRange('D6:D12').clearContent(); // gets rid of new inputted user info and "Thank you" type-messages
  
  // make inventory the active sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.setActiveSheet(sheet.getSheetByName('Enter Form'));
  
  // want the cursor to go to the top of the enter form
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var range = form.getRange('C2');
  form.setActiveRange(range);
}

// purp: to acknowledge a person returned an item 
//       goes into check out sheet and changes its returned column to 'yes'
function triggerYes(itemID) {
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  if (checkOut != null) {
    var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
    for (var i=0; i<values.length;i++) {
      if (values[i][2] == itemID && values[i][6] == 'no') {
        var cell = 'G' + (i + 1); // working with column G, add one to include counting title
        checkOut.getRange(cell).setValue('yes');
      }
    }
  }
}

// purp: takes the entered/scanned date and transforms it into a date the computer recognizes
function adjustReturn(returnDate) {
  var d = new Date(); // today's date
  var day = d.getDate(); // returns the day of the month (1-31)
  var month = d.getMonth(); // gets the month (0-11)
  
  // takes today's date and adds seven days to it
  if (returnDate == 'a week') { 
    d.setDate(day + 7);
    d.setHours(12);
    d.setMinutes(00);
    d.setMilliseconds(00);
    return d;
  }
  // takes today's date and adds a month to it
  else if (returnDate == 'a month') {
    d.setMonth(month + 1);
    d.setHours(12);
    d.setMinutes(00);
    d.setMilliseconds(00);
    return d;
  }
  // if return date isn't text but an actual date, then just return that in date format
  else {
    var g = new Date(returnDate);
    g.setYear(2016);
    g.setHours(12);
    g.setMinutes(00);
    g.setMilliseconds(00);
    return g;
  }
}

// purp: to find the current user who has the item
function itemToID(itemID) {
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var id;
  
  // takes itemID and goes into Check Out sheet to see who has checked it out (returns most recent ID)
  if (checkOut != null) {
    var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
    for (var i=0; i < values.length; i++) {
      if (values[i][2] == itemID) {
        id = values[i][0]; // captures last user ID to use object
      }
    }
    return id;
  }
  // item hasn't been checked out yet
  return '';
}

// purp: to get email from user ID
function IDtoEmail(id) {
  var database = SpreadsheetApp.getActive().getSheetByName('User Database');
  if (database != null) {
    var values = database.getRange(1, 1, database.getLastRow(), database.getLastColumn()).getValues();
    for (var i=0; i < values.length; i++) {
      if (values[i][0] == id) {
        return values[i][3]; 
      }
    }
  }
  return '';
}

// purp: to get user's name from their ID 
function IDtoUser(id) {
  var database = SpreadsheetApp.getActive().getSheetByName('User Database');
  if (database != null) {
    var values = database.getRange(1, 1, database.getLastRow(), database.getLastColumn()).getValues();
    for (var i=0; i < values.length; i++) {
      if (values[i][0] == id) {
        return values[i][1] + ' ' + values[i][2];
      }
    }
  }
  return '';
}

// purp: to check if user is in database
function inSystem(itemID, id, where) {
  if (itemID != '') {
    if (where == 'Out' && id != '') {
      // if scanned ID is in database, then YOU GOOD
      var database = SpreadsheetApp.getActive().getSheetByName('User Database');
      var values = database.getRange(1, 1, database.getLastRow(), database.getLastColumn()).getDisplayValues();
      
      for (var i=0; i<values.length; i++) {
        if (values[i][0] == id) {
          return 'You are in the system :)';
        }
      }
      // id was not found when looking through database
      return 'ID NOT FOUND! Please enter information below';
    }
    else if (where == 'In') {
      // returns last user's ID for check in
      return 'ID: ' + itemToID(itemID);
    }
  }
}

// purp: to interpret a date that is a string, returns a date (6/17/16) and transform date on the form
//       does nothing if user has entered a real date
function ifToday(itemID, returnDate) {
  var d = new Date();
  // today's date in standard notation
  d.toLocaleDateString();
  
  // returns current date if checking in
  if (inOrOut(itemID) == 'In') {
    return 'Returning on ' + d;
  }
  // adjusts return date if it's a string
  else if (inOrOut(itemID) == 'Out' && returnDate != '') {
    if (returnDate == 'a week' || returnDate == 'a month') {
      return adjustReturn(returnDate);
    }
  }
  return '';
}

// purp: to copy info from user database onto the etner form when ID is recognized
function copy(itemID, id) {
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var userDatabase = SpreadsheetApp.getActive().getSheetByName('User Database');
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var userID = itemToID(itemID);
  
  // if item is checked in, autofill field who has checked out this item
  if (inOrOut(itemID) == 'In' && userDatabase != null ) {
  // go into user database to get user's first & last name and email
    var values = userDatabase.getRange(1, 1, userDatabase.getLastRow(), userDatabase.getLastColumn()).getDisplayValues();
    for (var i=0; i < values.length; i++) {
      if(values[i][0] == userID) { // get last time user checked it out
        var array = ([values[i][1], values[i][2], values[i][3]]);
      }
    }
    return array;
  }
  // if item is checked out, autofill field is user ID is in the system
  else if (inOrOut(itemID) == 'Out' && id > 0 && userDatabase != null) {
    var values = userDatabase.getRange(1, 1, userDatabase.getLastRow(), userDatabase.getLastColumn()).getDisplayValues();
    for (var i = 0; i < values.length; i++) {
      if (values[i][0] == id) {
        return ([values[i][1], values[i][2], values[i][3]]);  
      }
    }
    // user ID is not recognized
    return (['Not found', 'Not found', 'Not found']);
  }
  return (['', '', '']);
}

// purp: to return the category, subcategory and any descriptors of the item ID as a single string
function inventory(itemID) {
  var inventory = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  
  if (itemID > 0 && inventory != null) {
    var values = inventory.getRange(1, 1, inventory.getLastRow(), inventory.getLastColumn()).getDisplayValues();
    for (var i=1; i<values.length; i++) {
      if (values[i][0] == itemID) {
        if (values[i][3] != '') {
          return values[i][1] +'/' + values[i][2] + '/' + values[i][3];
        }
        else {
          return values[i][1] +'/' + values[i][2];
        }
      }
    }
    return 'Not found in our system';
  }
  return ''; 
}

// purp: to only return descriptors (instead of returning category/subcategory/descriptors)
function specificInventory(itemID) {
  var inventory = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  
  if (itemID > 0 && inventory != null) {
    var values = inventory.getRange(1, 1, inventory.getLastRow(), inventory.getLastColumn()).getDisplayValues();
    for (var i=1; i<values.length; i++) {
      if (values[i][0] == itemID) {
        return values[i][3];
      }
    }
    return 'Not found in our system';
  }
  return ''; 
}

// purp: to determine if user is checking IN or OUT (depending on returned column in checked out sheet)
function inOrOut(itemID) {
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
  var status = '';
  
  // if item exists
  if (inventory(itemID) != '') { 
    // if it hasn't been checked out at all or returned column says 'Yes' then it can be checked OUT
    status = 'Out'; 
    for (var i=0; i<values.length; i++) {
      // if item hasn't been returned, it must be checked back IN
      if (values[i][2] == itemID && values[i][6] == 'no') {  
        status = 'In';
      }
    }
  }
  return status;
}

// purp: to send a confirmation email to user about item just checked out/in
function sendEmail(itemID, id, newReturnDate, where) {
  var emailAddress = IDtoEmail(id);
  var item = inventory(itemID);
  var user = IDtoUser(id);
  var message;
  var subject;
  
  // message should depend if they just checked something out or in (and if it's a kit or not)
  if (where == 'Out') { 
    subject = 'You just checked out: ' + item;
    if (itemID[0] == 2) { // if it's a kit
      message = 'Hello, ' + user + '! You recently checked out ' + item + ' with individual parts: ' + associatedItems(itemID) + '. It needs to be returned by ' + newReturnDate + '. Thank you, The Organization Team at the CEEO';
    }
    else {
      message = 'Hello, ' + user + '! You recently checked out ' + item + ' and it needs to be returned by ' + newReturnDate + '. Thank you, The Organization Team at the CEEO';
    }
    MailApp.sendEmail(emailAddress, subject, message);
  }
  else if (where == 'In') {
    subject = 'You just returned: ' + item;
    if (itemID[0] == 2) { // if it's a kit
      message = 'Hello, ' + user + '! You recently checked in ' + item + ' with individual parts: ' + associatedItems(itemID) + '. Thank you for bringing it back! Dr. E greatly appreciates it. Thank you, The Organization Team at the CEEO';
    }
    else {
      message = 'Hello, ' + user + '! You recently checked in ' + item + '. Thank you for bringing it back! Dr. E greatly appreciates it. Thank you, The Organization Team at the CEEO';
    }
    MailApp.sendEmail(emailAddress, subject, message);
  }
}

// currently not working
// purp: to send a reminder email when user has a week left or it's past due date & unreturned
function reminderEmail() {
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
  
  for (var i=0; i < values.length; i++) {
    // if object has NOT been returned AND has 7 days until return, send an email
    if (values[i][6] == 'no') { // if item has not been returned
      if (values[i][7] == 7) {
        var id = values[i][0];
        var itemID = values[i][2];
        var item = values[i][3];
        var emailAddress = IDtoEmail(id);
        var user = IDtoUser(id);
        var subject = 'You have one week to return: ' + item;
        if (itemID[0] == 2) {
          var message = 'Hello, ' + user + '! You checked out ' + item + ' with individual parts: ' + associatedItems(itemID) + ' on ' + values[i][5] + '. It need to be returned in a week: ' + values[i][4] + '. Thank you, The Organization Team at the CEEO';
        }
        else {
          var message = 'Hello, ' + user + '! You checked out ' + item + ' on ' + values[i][5] + '. It needs to be returned in a week: ' + values[i][4] + '. Thank you, The Organization Team at the CEEO';
        }
        MailApp.sendEmail(emailAddress, subject, message);
      }
      // if object has NOT been returned AND has 0 or less days until return, send an email
      else if (values[i][7] < 0) {
        var id = values[i][0];
        var itemID = values[i][2];
        var item = values[i][3]
        var emailAddress = IDtoEmail(id);
        var user = IDtoUser(id);
        var subject = 'Please return your overdue item: ' + item;
        if (itemID[0] == 2) {
          var message = 'Hello, ' + user + '. You checked out ' + item + ' with individual parts: ' + associatedItems(itemID) + ' on ' + values[i][5] + '. It was supposed to be returned ' + values[i][7] + ' day(s) ago. Please get it in as soon as possible. Thank you, The Organization Team at the CEEO';
        }
        else {
          var message = 'Hello, ' + user + '. You checked out ' + item + ' on ' + values[i][5] + '. It was supposed to be returned ' + values[i][7] + ' day(s) ago. Please get it in as soon as possible. Thank you, The Organization Team at the CEEO';
        }
        MailApp.sendEmail(emailAddress, subject, message);
      }
    }
  }
}

// purp: to increment the number of times item has been checked out in inventory 
function countItem(itemID) {
  var inventory = SpreadsheetApp.getActive().getSheetByName('Inventory');
  if (inventory != null) {
    var values = inventory.getRange(1, 1, inventory.getLastRow(), inventory.getLastColumn()).getDisplayValues();
   
    for (var i=0; i < values.length; i++) {
      // if item is in inventory
      if (values[i][0] == itemID) {
        var count = values[i][4]; // capture the current count of the item
        var cell = 'E' + (i+1); // E is the column with number of times checked out
        if (count == null) { // sets the count if first time checked out
          count = 1;
          inventory.getRange(cell).setValue(count); // adjusting the new count
        }
        else {
          count++;
          inventory.getRange(cell).setValue(count);
        }
      }
    }
  }
}

// purp: to check out all the individual parts of a kit 
function multipleCheckOut(id, name, itemID, newReturnDate, timestamp) {
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  
  // index for singular parts is 1 - need to subtract ~100 billion
  var partItemID = itemID - 99999999999; // the possible itemID number for the individual parts in the kit
  var max = partItemID + 10;  // # of things that can fit in a kit - 
                              // really should be partItemID + 99, but function is slow looking through all 99 possible options
  
  // we wanna catch all of the individual parts that exist in the inventory    
  for (partItemID; partItemID < max; partItemID++) { 
    if (inventory(partItemID) != 'Not found in our system') {
      checkOut.appendRow([id, name, partItemID, inventory(partItemID), newReturnDate, timestamp, 'no']);
    }
  }
}

// purp: to check in all the individual parts of a kit 
function multipleCheckIn(id, name, itemID, timestamp) {
  // need to go into checkOut and find the user and the kit he checked out. 
  // It's already been checked in so find the items associated with the kit and check those in
  var checkIn = SpreadsheetApp.getActive().getSheetByName('Check In'); 
  var partItemID = itemID - 99999999999;
  var max = partItemID + 10; // max # of things in a kit - should be +99, but takes time
  
  for (partItemID; partItemID < max; partItemID++) { 
    if (inventory(partItemID) != 'Not found in our system') {
      checkIn.appendRow([id, name, partItemID, inventory(partItemID), timestamp]);
      triggerYes(partItemID); // each item is recognized for being turned in
    }
  }
}

// purp: to return a string of all the parts in a kit
function associatedItems(itemID) {
  var partItemID = itemID - 99999999999;
  var max = partItemID + 10;
  var string = '';
  
  for (partItemID; partItemID < max; partItemID++) { 
    if (specificInventory(partItemID) != 'Not found in our system') {
      string += specificInventory(partItemID) + ', ';
    }
  }
  
  if (string != '') { // take off last comma and space
    string = string.substring(0, string.length - 2);
  }
  
  return string;
}

// purp: to take you to a page with information about that item's history
//       if itemID doesn't exist in inventory, put up warning
function clickForMore() {
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var itemID = form.getRange('C2').getDisplayValue();

  if (itemID > 0 && inventory(itemID) != 'Not found in our system') {  
    // make More Info the active sheet
    var info = SpreadsheetApp.getActiveSpreadsheet();
    SpreadsheetApp.setActiveSheet(info.getSheetByName('More Info'));
  
    // adding item's name to top of sheet
    info.getRange('A1').setValue('MORE INFORMATION ABOUT: ');
    info.getRange('B1').setValue(inventory(itemID)); 
  
    // displays all the info about who has checked out that item and when
    history(itemID);
    
    // print out contents of kit if it's one
    if (itemID[0] == '2') {
      insideKit(itemID);
    }
  }
  else {
    form.getRange('D9').setValue('Invalid item number');
    var range = form.getRange('C2');
    form.setActiveRange(range);
  }
}

// purp: to show who has previously checked out this item and how many times it has been checked out
function history(itemID) {
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
  var info = SpreadsheetApp.getActive().getSheetByName('More Info');
  var count = 0;
  var currentUser;
  var returned;

  // prints out who has printed out this item and when in chronological order
  if (checkOut != null) {
    for (var i=values.length-1; i>0; i--) {
      if (values[i][2] == itemID) {
        count++;
        returned = values[i][6]; // see if last user has checked it out or in
        var cell = 'A' + (count+4);
        currentUser = values[i][1]; // gets last user that has checked out item
        // create a complete list of everyone who has checked it in
        info.getRange(cell).setValue(currentUser + ' checked it out on ' + values[i][5] + '. ');
      }
    }
    
    if (returned == 'no') {
      info.getRange('C1').setValue('This item is currently checked out');
    }
    else if (isComplete(itemID) != '') {
      info.getRange('C1').setValue('This kit is currently incomplete');
      info.getRange('C2').setValue('MISSING: ' + isComplete(itemID)); 
    }
    else if (returned == 'yes') {
      info.getRange('C1').setValue('This item is open to use in the lab');
    }
   
    // print out who has checked out item and how many times
    if (count == 0) {
      info.getRange('A3').setValue(inventory(itemID) + ' has not been checked out yet.');
    }
    else {
      info.getRange('A3').setValue(inventory(itemID) + ' was last checked out by ' + currentUser);
     
      // only include info about # of times checked out if it HAS been checked out
      if (count == 1) {
        info.getRange('A4').setValue('It has been checked out ' + count + ' time.');
      }
      else {
        info.getRange('A4').setValue('It has been checked out ' + count + ' times.');
      }
    }
  }
}

// purp: to print out info of what is inside kit
function insideKit(itemID) {
  var info = SpreadsheetApp.getActive().getSheetByName('More Info');
  var count = 0;
  var partItemID = itemID - 99999999999;
  var max = partItemID + 10; // max # of things in a kit - should be +99, but takes time
  info.getRange('B3').setValue('Contents of Kit: ');
  info.getRange('C3').setValue('Who Last Checked Out: ');
  
  // find individual items that are part of the kit in the inventory
  for (partItemID; partItemID < max; partItemID++) { 
    if (inventory(partItemID) != 'Not found in our system') {
      count++;
      var cell = 'B' + (count+3);
      var adjcell = 'C' + (count+3);
      
      // gets last person's name who used the item
      var id = itemToID(partItemID);
      var who = IDtoUser(id);
      
      // print out item if it's inside the kit
      info.getRange(cell).setValue(inventory(partItemID));
      info.getRange(adjcell).setValue(who);
    }
  }
}

// purp: to clear info on 'more info' sheet and return to enter form
function resetInfo() {
  var info = SpreadsheetApp.getActive().getSheetByName('More Info');
  info.getRange('A1:C1000').clearContent(); // cleans page for next time user asks about another item/if info changes
  
  // make enter form the active page
  // problem: deletes info that was on page but maybe you want to keep that (is it worth making a separate function?)
  reset();
}

// purp: to check if entire kit is available to be checked out and if returned col says yes - returns items that are not available/separate
function isComplete(itemID) {
  // only called if a kit is being checked out
  if (inOrOut(itemID) == 'Out' && itemID[0] == '2') {
    var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
    var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
    var complete = true; // if not checked out at all, then it's there in lab
    var itemOut = '';
  
    var partItemID = itemID - 99999999999;
    var max = partItemID + 10; // max # of things in a kit - should be +99, but takes time
    // find individual items that are part of the kit in the inventory
    for (partItemID; partItemID < max; partItemID++) { 
      if (inventory(partItemID) != 'Not found in our system') {
        // then look at check out to see if that item has been checked out AND returned
        for (var i=0; i<values.length; i++) {
          if (values[i][2] == partItemID && values[i][6] == 'no') {
            complete = false;
            itemOut = values[i][3];
          }
        }
      }
    }
    return itemOut;
  }
  return '';
}

// purp: displays a READY TO SUBMIT message if all pieces of information are taken care of
function readyToSubmit(itemID, id, date ,inOrOut) {
  if (inOrOut == 'In') {
    return 'READY TO SUBMIT';
  }
  else if (inOrOut == 'Out' && itemID != '' && id != '' && date != '') {
    return 'READY TO SUBMIT';
  }
  return '';
}

// purp: to make the add page pop up
function add() {
  var add = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.setActiveSheet(add.getSheetByName('Add'));
  
  // cursor moves to first enter box
  var range = add.getRange('C4');
  add.setActiveRange(range);
}

// purp: to collect the new item's information, add to inventory, and to return to Enter Form sheet
function saveAndReturn() { 
  var add = SpreadsheetApp.getActive().getSheetByName('Add');
  var itemID = add.getRange('C4').getDisplayValue();
  var category = add.getRange('C5').getDisplayValue();
  var subcategory = add.getRange('C6').getDisplayValue();
  var descriptors = add.getRange('C7').getDisplayValue();
  
  // info to inventory
  var inventory = SpreadsheetApp.getActive().getSheetByName('Inventory');
 
  if (itemID != '' && category != '' && subcategory != '') {
    inventory.appendRow([itemID, category, subcategory, descriptors, '0', 'good']); // establish that it's in good condition
     // clear C4 to C7 for next time someone wants to add
    add.getRange('C4:C7').clearContent(); 
    add.getRange('D8').clearContent(); // clear if Need more information is still there
    // make enter form active one
    reset();
  }
  else {
    var add = SpreadsheetApp.getActive().getSheetByName('Add');
    add.getRange('D8').setValue('Need more information');
  }
}

// purp: to take the entered item ID and place it in the missing/broken field on the Add sheet
function messedUp() {
  var form = SpreadsheetApp.getActive().getSheetByName('Enter Form');
  var itemID = form.getRange('C2').getDisplayValue();
  
  // made Add the active sheet
  var add = SpreadsheetApp.getActive().getSheetByName('Add');
  SpreadsheetApp.setActiveSheet(add);
  
  // want the cursor to go to the top of the Add shet
  var range = add.getRange('C19');
  add.setActiveRange(range);
  
  // put itemID into C17
  add.getRange('C17').setValue(itemID);
}

// purp: to collect info about broken/missing item and add to Missing/Broken sheet
//       this function assumes that it won't be broken before its first check out
function saveAndReturn2() {
  // grabbing itemID from add form
  var add = SpreadsheetApp.getActive().getSheetByName('Add');
  var itemID = add.getRange('C17').getDisplayValue();
  var state = add.getRange('C19').getDisplayValue();
  
  var lastID = '';
  var checkOut = SpreadsheetApp.getActive().getSheetByName('Check Out');
  var values = checkOut.getRange(1, 1, checkOut.getLastRow(), checkOut.getLastColumn()).getDisplayValues();
  for (var i=0; i<values.length; i++) {
    if (values[i][2] == itemID) {
      // capture last user who checked the item out (if it has been)
      // this is all *ASSUMING* that the user who broke it/lost it is bringing it back
      lastID = values[i][0];
    }
  }
 
  // if info has been entered, then append
  if (itemID != '' && state != '') {
    // append info if it has all been entered
    var messy = SpreadsheetApp.getActive().getSheetByName('Missing/Broken');
    messy.appendRow([lastID, IDtoUser(lastID), itemID, inventory(itemID), new Date(), state]);
    if (lastID != '') {
      // effectively check item in if it hasn't already, but it HAS been checked out
      triggerYes(itemID);
    }
  }
  // changes state of condition in inventory
  changeCondition(itemID, state);
 
  // erasing entered info so it's ready for next entry
  add.getRange('C17:D19').clearContent();
  
  // takes user back to the enter form
  reset();
}

// purp: to go into inventory and change CONDITION status
function changeCondition(itemID, state) {
  var inventory = SpreadsheetApp.getActive().getSheetByName('Inventory');
  var values = inventory.getRange(1, 1, inventory.getLastRow(), inventory.getLastColumn()).getDisplayValues();
  for (var i=0; i<values.length; i++) {
    if (values[i][0] == itemID) {
      var cell = 'F' + (i+1);
      inventory.getRange(cell).setValue(state);
    }
  }
}

// purp: to take the user to the spot in inventory sheet where related category begins
//       **** need a more efficient way to return to original page function
function searching() {
  var result = '';
  var add = SpreadsheetApp.getActive().getSheetByName('Add');
  var category = add.getRange('C12').getDisplayValue();
  
  if (category != '') {
    // look through items in inventory to see when category entered matches place in sheet
    var inventory = SpreadsheetApp.getActive().getSheetByName('Inventory');
    var values = inventory.getRange(1, 1, inventory.getLastRow(), inventory.getLastColumn()).getDisplayValues();
    var i=0;
    var cell = '';
    while (category != values[i][1]) {
      i++;
      if (category == values[i][1]) {
        cell = 'B' + (i+1);  // captures when the category begins
      }
    } 
    
    if (cell != '') {
      // make inventory the active sheet
      var sheet = SpreadsheetApp.getActiveSpreadsheet();
      SpreadsheetApp.setActiveSheet(sheet.getSheetByName('Inventory'));
  
      // want the cursor to go to the top of the sheet
      var range = inventory.getRange(cell);
      inventory.setActiveRange(range);
    }   
  }
}