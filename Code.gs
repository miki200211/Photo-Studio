/**
 * Google Apps Script Web App Backend for Photo Studio
 * 
 * Configurations:
 * Folders will be structured in your Google Drive as:
 * [My Drive]
 *   └─ Photo Studio (Main folder)
 *        ├─ Photo Studio Database (Contains uploaded images)
 *        ├─ Photo Studio Messenger (Contains the Messenger Database for posts & comments)
 *        └─ Account (Contains the Account Database for users, emails, and names)
 */

/**
 * GET requests handler (Read posts and comments)
 */
function doGet(e) {
  try {
    var data = getFeedData();
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST requests handler (Register, Login, Upload, Comment, React, Edit/Delete)
 * Note: Use Content-Type "text/plain" in client requests to bypass CORS preflight checks.
 */
function doPost(e) {
  var response = { success: false, message: "" };
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error("Empty request body");
    }
    
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    
    if (action === "uploadPost") {
      response = handleUploadPost(payload);
    } else if (action === "addComment") {
      response = handleAddComment(payload);
    } else if (action === "reactPost") {
      response = handleReactPost(payload);
    } else if (action === "editPost") {
      response = handleEditPost(payload);
    } else if (action === "deletePost") {
      response = handleDeletePost(payload);
    } else if (action === "editComment") {
      response = handleEditComment(payload);
    } else if (action === "deleteComment") {
      response = handleDeleteComment(payload);
    } else if (action === "getFeed") {
      response = { success: true, data: getFeedData() };
    } else {
      response.message = "Unknown action: " + action;
    }
  } catch(err) {
    response.success = false;
    response.message = "Error: " + err.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Find or create a folder
 */
function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder ? parentFolder.getFoldersByName(folderName) : DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  var newFolder = parentFolder ? parentFolder.createFolder(folderName) : DriveApp.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * DB Helper: Get or create the main Photo Studio folder structure
 */
function getPhotoStudioFolderStructure() {
  var mainFolder = getOrCreateFolder(null, "Photo Studio");
  var imageFolder = getOrCreateFolder(mainFolder, "Photo Studio Database");
  var messengerFolder = getOrCreateFolder(mainFolder, "Photo Studio Messenger");
  var accountFolder = getOrCreateFolder(mainFolder, "Account");
  
  return {
    main: mainFolder,
    database: imageFolder,     // stores images
    messenger: messengerFolder, // stores comments & posts
    account: accountFolder      // stores user accounts
  };
}

/**
 * DB Helper: Get or create the Account Database spreadsheet
 */
function getAccountSpreadsheet() {
  var structure = getPhotoStudioFolderStructure();
  var accountFolder = structure.account;
  
  var files = accountFolder.getFilesByName("Account Database");
  if (files.hasNext()) {
    var file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  var ss = SpreadsheetApp.create("Account Database");
  var sheet = ss.getActiveSheet();
  sheet.setName("Users");
  sheet.appendRow(["Email", "Password", "Name", "CreatedAt"]);
  
  var file = DriveApp.getFileById(ss.getId());
  file.moveTo(accountFolder);
  
  return ss;
}

/**
 * DB Helper: Get or create the Messenger Database spreadsheet
 */
function getMessengerSpreadsheet() {
  var structure = getPhotoStudioFolderStructure();
  var messengerFolder = structure.messenger;
  
  var files = messengerFolder.getFilesByName("Messenger Database");
  if (files.hasNext()) {
    var file = files.next();
    var ss = SpreadsheetApp.openById(file.getId());
    
    var postsSheet = ss.getSheetByName("Posts");
    if (postsSheet && postsSheet.getLastRow() > 0) {
      var range = postsSheet.getRange(1, 8);
      if (range.getValue() !== "Reactions") {
        range.setValue("Reactions");
      }
    }
    return ss;
  }
  
  var ss = SpreadsheetApp.create("Messenger Database");
  
  var postsSheet = ss.getActiveSheet();
  postsSheet.setName("Posts");
  postsSheet.appendRow(["Id", "Email", "Name", "ImageUrl", "DriveFileId", "Description", "CreatedAt", "Reactions"]);
  
  var commentsSheet = ss.insertSheet("Comments");
  commentsSheet.appendRow(["Id", "PostId", "Email", "Name", "Comment", "CreatedAt"]);
  
  var file = DriveApp.getFileById(ss.getId());
  file.moveTo(messengerFolder);
  
  return ss;
}

/**
 * DB Helper: Get the Photo Studio Database folder for uploads (images)
 */
function getDriveFolder() {
  var structure = getPhotoStudioFolderStructure();
  return structure.database;
}



/**
 * Action Handler: Upload Post
 */
function handleUploadPost(payload) {
  var email = (payload.email || "").trim();
  var name = (payload.name || "").trim();
  var description = payload.description || "";
  var fileBase64 = payload.imageBase64;
  var mimeType = payload.mimeType || "image/jpeg";
  var fileName = payload.fileName || ("upload_" + new Date().getTime());
  
  if (!email || !name || !fileBase64) {
    return { success: false, message: "Author details and image file are required" };
  }
  
  var base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  
  var folder = getDriveFolder();
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var driveFileId = file.getId();
  var imageUrl = "https://lh3.googleusercontent.com/d/" + driveFileId;
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Posts");
  var postId = "post_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
  
  sheet.appendRow([
    postId,
    email,
    name,
    imageUrl,
    driveFileId,
    description,
    new Date().toISOString(),
    "{}"
  ]);
  
  return { 
    success: true, 
    message: "Post uploaded successfully!",
    post: {
      id: postId,
      email: email,
      name: name,
      imageUrl: imageUrl,
      description: description,
      createdAt: new Date().toISOString(),
      reactions: {}
    }
  };
}

/**
 * Action Handler: Edit Post Description
 */
function handleEditPost(payload) {
  var postId = payload.postId;
  var email = (payload.email || "").trim().toLowerCase();
  var description = payload.description || "";
  
  if (!postId || !email || !description) {
    return { success: false, message: "Missing required fields" };
  }
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Posts");
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === postId) {
      if (data[i][1].toString().toLowerCase() !== email) {
        return { success: false, message: "Unauthorized: You do not own this post" };
      }
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: "Post not found" };
  }
  
  // Update description column (6th column, index F)
  sheet.getRange(foundRow, 6).setValue(description);
  return { success: true, message: "Post description updated successfully" };
}

/**
 * Action Handler: Delete Post, Comments, and Drive File
 */
function handleDeletePost(payload) {
  var postId = payload.postId;
  var email = (payload.email || "").trim().toLowerCase();
  
  if (!postId || !email) {
    return { success: false, message: "Missing post reference or author credentials" };
  }
  
  var ss = getMessengerSpreadsheet();
  var postsSheet = ss.getSheetByName("Posts");
  var data = postsSheet.getDataRange().getValues();
  
  var foundRow = -1;
  var driveFileId = "";
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === postId) {
      if (data[i][1].toString().toLowerCase() !== email) {
        return { success: false, message: "Unauthorized: You do not own this post" };
      }
      foundRow = i + 1;
      driveFileId = data[i][4].toString();
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: "Post not found" };
  }
  
  // 1. Delete post row from spreadsheet
  postsSheet.deleteRow(foundRow);
  
  // 2. Cascade delete comments
  var commentsSheet = ss.getSheetByName("Comments");
  if (commentsSheet && commentsSheet.getLastRow() > 1) {
    var commentsData = commentsSheet.getDataRange().getValues();
    for (var j = commentsData.length - 1; j >= 1; j--) {
      if (commentsData[j][1].toString() === postId) {
        commentsSheet.deleteRow(j + 1);
      }
    }
  }
  
  // 3. Move image file in Google Drive to Trash
  if (driveFileId) {
    try {
      var file = DriveApp.getFileById(driveFileId);
      file.setTrashed(true);
    } catch(e) {
      console.warn("Could not trash Drive file: " + e.toString());
    }
  }
  
  return { success: true, message: "Post deleted successfully" };
}

/**
 * Action Handler: Add Comment
 */
function handleAddComment(payload) {
  var postId = payload.postId;
  var email = (payload.email || "").trim();
  var name = (payload.name || "").trim();
  var commentText = (payload.comment || "").trim();
  
  if (!postId || !email || !name || !commentText) {
    return { success: false, message: "Missing post reference or author credentials" };
  }
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Comments");
  var commentId = "comment_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
  
  sheet.appendRow([
    commentId,
    postId,
    email,
    name,
    commentText,
    new Date().toISOString()
  ]);
  
  return { 
    success: true, 
    message: "Comment added!",
    comment: {
      id: commentId,
      postId: postId,
      email: email,
      name: name,
      comment: commentText,
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Action Handler: Edit Comment
 */
function handleEditComment(payload) {
  var commentId = payload.commentId;
  var email = (payload.email || "").trim().toLowerCase();
  var commentText = (payload.comment || "").trim();
  
  if (!commentId || !email || !commentText) {
    return { success: false, message: "Missing required fields" };
  }
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Comments");
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === commentId) {
      if (data[i][2].toString().toLowerCase() !== email) {
        return { success: false, message: "Unauthorized: You do not own this comment" };
      }
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: "Comment not found" };
  }
  
  // Update comment text (5th column, index E)
  sheet.getRange(foundRow, 5).setValue(commentText);
  return { success: true, message: "Comment updated successfully" };
}

/**
 * Action Handler: Delete Comment
 */
function handleDeleteComment(payload) {
  var commentId = payload.commentId;
  var email = (payload.email || "").trim().toLowerCase();
  
  if (!commentId || !email) {
    return { success: false, message: "Missing comment reference or author credentials" };
  }
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Comments");
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === commentId) {
      if (data[i][2].toString().toLowerCase() !== email) {
        return { success: false, message: "Unauthorized: You do not own this comment" };
      }
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: "Comment not found" };
  }
  
  sheet.deleteRow(foundRow);
  return { success: true, message: "Comment deleted successfully" };
}

/**
 * Action Handler: React to Post (Toggle Support added)
 */
function handleReactPost(payload) {
  var postId = payload.postId;
  var emoji = payload.emoji;
  var isRemoving = payload.isRemoving === true;
  
  if (!postId || !emoji) {
    return { success: false, message: "Missing post reference or emoji key" };
  }
  
  var ss = getMessengerSpreadsheet();
  var sheet = ss.getSheetByName("Posts");
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === postId) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow === -1) {
    return { success: false, message: "Post not found" };
  }
  
  var cell = sheet.getRange(foundRow, 8);
  var val = cell.getValue().toString().trim();
  var reactions = {};
  
  if (val !== "") {
    try {
      reactions = JSON.parse(val);
    } catch(e) {
      reactions = {};
    }
  }
  
  if (isRemoving) {
    if (reactions[emoji]) {
      reactions[emoji] = Math.max(0, reactions[emoji] - 1);
    }
  } else {
    if (!reactions[emoji]) {
      reactions[emoji] = 0;
    }
    reactions[emoji] = reactions[emoji] + 1;
  }
  
  cell.setValue(JSON.stringify(reactions));
  
  return { 
    success: true, 
    message: "Reaction updated", 
    postId: postId, 
    reactions: reactions 
  };
}

/**
 * Read Helper: Fetch feed posts, their comments and reactions
 */
function getFeedData() {
  var ss = getMessengerSpreadsheet();
  
  var postsSheet = ss.getSheetByName("Posts");
  var commentsSheet = ss.getSheetByName("Comments");
  
  var posts = [];
  var comments = [];
  
  if (postsSheet && postsSheet.getLastRow() > 1) {
    var postsData = postsSheet.getRange(2, 1, postsSheet.getLastRow() - 1, 8).getValues();
    posts = postsData.map(function(row) {
      var reactionsVal = row[7] ? row[7].toString().trim() : "{}";
      var reactions = {};
      try {
        reactions = JSON.parse(reactionsVal);
      } catch(e) {
        reactions = {};
      }
      return {
        id: row[0].toString(),
        email: row[1].toString(),
        name: row[2].toString(),
        imageUrl: row[3].toString(),
        driveFileId: row[4].toString(),
        description: row[5].toString(),
        createdAt: row[6].toString(),
        reactions: reactions
      };
    });
    posts.sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  
  if (commentsSheet && commentsSheet.getLastRow() > 1) {
    var commentsData = commentsSheet.getRange(2, 1, commentsSheet.getLastRow() - 1, 6).getValues();
    comments = commentsData.map(function(row) {
      return {
        id: row[0].toString(),
        postId: row[1].toString(),
        email: row[2].toString(),
        name: row[3].toString(),
        comment: row[4].toString(),
        createdAt: row[5].toString()
      };
    });
    comments.sort(function(a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }
  
  posts.forEach(function(post) {
    post.comments = comments.filter(function(c) {
      return c.postId === post.id;
    });
  });
  
  return posts;
}

/**
 * Developer utility function to clear all database records and Drive uploaded images.
 * Select and run this function in the Google Apps Script editor to reset the studio database.
 */
function devClearAllDatabaseData() {
  var structure = getPhotoStudioFolderStructure();
  
  // 1. Clear Messenger Database (Posts & Comments)
  try {
    var messengerSs = getMessengerSpreadsheet();
    
    var postsSheet = messengerSs.getSheetByName("Posts");
    if (postsSheet && postsSheet.getLastRow() > 1) {
      postsSheet.deleteRows(2, postsSheet.getLastRow() - 1);
      console.log("Cleared Posts sheet.");
    }
    
    var commentsSheet = messengerSs.getSheetByName("Comments");
    if (commentsSheet && commentsSheet.getLastRow() > 1) {
      commentsSheet.deleteRows(2, commentsSheet.getLastRow() - 1);
      console.log("Cleared Comments sheet.");
    }
  } catch (err) {
    console.error("Error clearing messenger spreadsheet: " + err.toString());
  }
  
  // 2. Clear Account Database (Users)
  try {
    var accountSs = getAccountSpreadsheet();
    var usersSheet = accountSs.getSheetByName("Users");
    if (usersSheet && usersSheet.getLastRow() > 1) {
      usersSheet.deleteRows(2, usersSheet.getLastRow() - 1);
      console.log("Cleared Users sheet.");
    }
  } catch (err) {
    console.error("Error clearing account spreadsheet: " + err.toString());
  }
  
  // 3. Clear Google Drive uploaded files in the database folder
  try {
    var folder = structure.database;
    var files = folder.getFiles();
    var count = 0;
    while (files.hasNext()) {
      var file = files.next();
      file.setTrashed(true);
      count++;
    }
    console.log("Trashed " + count + " image files from Google Drive folder.");
  } catch (err) {
    console.error("Error trashing Drive files: " + err.toString());
  }
  
  return "Database and Drive folder reset successfully!";
}
