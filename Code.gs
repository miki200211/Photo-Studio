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
 * POST requests handler (Register, Login, Upload, Comment)
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
    
    if (action === "register") {
      response = handleRegister(payload);
    } else if (action === "login") {
      response = handleLogin(payload);
    } else if (action === "uploadPost") {
      response = handleUploadPost(payload);
    } else if (action === "addComment") {
      response = handleAddComment(payload);
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
  // Set sharing to anyone with link can view
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * DB Helper: Get or create the main Photo Studio folder structure
 */
function getPhotoStudioFolderStructure() {
  // 1. Get or create root "Photo Studio" folder
  var mainFolder = getOrCreateFolder(null, "Photo Studio");
  
  // 2. Get or create subfolders
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
  
  // Look for spreadsheet inside the Account folder
  var files = accountFolder.getFilesByName("Account Database");
  if (files.hasNext()) {
    var file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  // Create spreadsheet and move it to Account folder
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
  
  // Look for spreadsheet inside the Messenger folder
  var files = messengerFolder.getFilesByName("Messenger Database");
  if (files.hasNext()) {
    var file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  // Create spreadsheet and move it to Messenger folder
  var ss = SpreadsheetApp.create("Messenger Database");
  
  // Setup Posts sheet
  var postsSheet = ss.getActiveSheet();
  postsSheet.setName("Posts");
  postsSheet.appendRow(["Id", "Email", "Name", "ImageUrl", "DriveFileId", "Description", "CreatedAt"]);
  
  // Setup Comments sheet
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
 * Action Handler: Register
 */
function handleRegister(payload) {
  var email = (payload.email || "").trim().toLowerCase();
  var password = payload.password || "";
  var name = (payload.name || "").trim(); // This is the pseudonym / nickname
  
  if (!email || !password || !name) {
    return { success: false, message: "Missing required fields" };
  }
  
  var ss = getAccountSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  // Check if email already registered
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === email) {
      return { success: false, message: "Email is already registered" };
    }
  }
  
  sheet.appendRow([email, password, name, new Date().toISOString()]);
  return { success: true, message: "Registration successful!", user: { email: email, name: name } };
}

/**
 * Action Handler: Login
 */
function handleLogin(payload) {
  var email = (payload.email || "").trim().toLowerCase();
  var password = payload.password || "";
  
  if (!email || !password) {
    return { success: false, message: "Email and password are required" };
  }
  
  var ss = getAccountSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === email && data[i][1].toString() === password) {
      return { 
        success: true, 
        message: "Login successful!", 
        user: { email: data[i][0], name: data[i][2] } 
      };
    }
  }
  
  return { success: false, message: "Invalid email or password" };
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
  
  // Clean base64 string
  var base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  
  // Save to Drive (Photo Studio Database folder)
  var folder = getDriveFolder();
  var file = folder.createFile(blob);
  
  // Set sharing to public viewable
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Construct the URL to view the image
  var driveFileId = file.getId();
  var imageUrl = "https://lh3.googleusercontent.com/d/" + driveFileId;
  
  // Write to Spreadsheet
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
    new Date().toISOString()
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
      createdAt: new Date().toISOString()
    }
  };
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
 * Read Helper: Fetch feed posts and their comments
 */
function getFeedData() {
  var ss = getMessengerSpreadsheet();
  
  var postsSheet = ss.getSheetByName("Posts");
  var commentsSheet = ss.getSheetByName("Comments");
  
  var posts = [];
  var comments = [];
  
  if (postsSheet && postsSheet.getLastRow() > 1) {
    var postsData = postsSheet.getRange(2, 1, postsSheet.getLastRow() - 1, 7).getValues();
    posts = postsData.map(function(row) {
      return {
        id: row[0].toString(),
        email: row[1].toString(),
        name: row[2].toString(),
        imageUrl: row[3].toString(),
        driveFileId: row[4].toString(),
        description: row[5].toString(),
        createdAt: row[6].toString()
      };
    });
    // Sort posts: newest first
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
    // Sort comments: oldest first
    comments.sort(function(a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }
  
  // Group comments inside posts
  posts.forEach(function(post) {
    post.comments = comments.filter(function(c) {
      return c.postId === post.id;
    });
  });
  
  return posts;
}
