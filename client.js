window.WebSocket = window.WebSocket || window.MozWebSocket;
var connection = new WebSocket("ws://localhost:1337");

// DOM stuff
// move all of this to jQuery
var chatbox = document.getElementById("messages");
var chatInput = document.getElementById("chatInput");
var userlist = document.getElementById("userList");
//var status = document.getElementById("status");
var usernames = document.getElementsByClassName("usernames");

// websocket stuff
connection.onopen = function (error) {
  chatbox.innerHTML = "connecting to host..." + "<br>";
}

connection.onmessage = function (message) {
  // receive message from server
  var json = JSON.parse(message.data);

  // check json message type, handle accordingly
  switch (json.type) {
    case 'status':
      chatbox.innerHTML += json.data + "<br>";
      gotoBottom("messages");
      break;
    case 'chatmessage':
      let msg = addMessage(json.data.user, json.data.text);
      if (msg) {
        chatmsg = document.createElement("chatmsg");
        chatmsg.innerHTML += msg + "<br>";
        chatbox.appendChild(chatmsg);
      }
      gotoBottom("messages");
      break;
    case 'privmsg':
      let privmsg = document.createElement("privmsg");
      privmsg.innerHTML += "[private] " + json.data.user + ": " + json.data.text + "<br>";
      chatbox.appendChild(privmsg);
      gotoBottom("messages");
      break;
    case 'privmsgto':
      let privmsgto = document.createElement("privmsg");
      privmsgto.innerHTML += "to " + json.data.user + ": " + json.data.text + "<br>";
      chatbox.appendChild(privmsgto);
      gotoBottom("messages");
      break;  
    case 'users':
      getUsers(json);
      gotoBottom("userlist");
      break;
  }

}

//setInterval(pingServer("http://localhost:1337/status"), 3000);


function sendMessage() {
  theMessage = chatInput.value;
  connection.send(theMessage);
  document.chatInput.value = "";
}

function addMessage(username, message) {
  if (username != false) {
    return "&lt;" + username + "&gt; " + message;
  } else {
    return message;
  }
}


/////
//
// event handling
//
/////


// context menu stuff
var usermenu = false;

// handle all mouse events
document.addEventListener('mousedown', function (e) {
  let tag = e.target.tagName;

  // close user menu if open
  if (usermenu) {
    switch (tag) {
      case "USERMENU":
        break;
      case "ITEM":
        break;
      default:
        closeUserMenu(usermenu);
        usermenu = false;
        break;
    } 
  }

  // put a main menu screen overlay in here

  // handle context menu events
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();

    // spawn userlist menu, close if clicked within userlist
    // re-open if username is right-clicked again
    userlist.addEventListener(
      "contextmenu",
      function(e) {
        let tag = e.target.tagName;

        var mouseX = e.screenX;
        var mouseY = e.screenY;

        if (tag == "USERNAMES") {
          if (!usermenu) {
            usermenu = openUserMenu(mouseX, mouseY);
          } else {
            closeUserMenu(usermenu);
            usermenu = openUserMenu(mouseX, mouseY);
          }
        } else {
          if (usermenu) {
            closeUserMenu(usermenu);
            usermenu = false;
          }
        }

        return false;
      },
      false
    );

  });
  return false;
}, false);

// variables for keyboard input
// put this somewhere else
var userlistlist;
var cmds = [
  "/msg",
  "/nick",
  "/scroll",
]
var tabCount = 0;
let cycling = false;
// handle chat input
chatInput.addEventListener("keydown", function (e) {
  switch (e.keyCode) {
    // enter
    case 13:
      var msg = chatInput.value;
      if (!msg) {
        return;
      }
      // send the message as an ordinary text
      connection.send(msg);
      chatInput.value = "";
      break;
    // tab-completion (only usernames at the moment)
    // it werks, now implement string matching
    case 9:
      let current = chatInput.value.split(" ");
      if (cycling) {
        current[current.length - 1] = userlistlist[count];
        chatInput.value = current.join(" ");
        count == userlistlist.length - 1 ? count = 0 : count++;
      } else if (current[0] == "" || current[current.length - 1] == "") {
        cycling = true;
        count = 0;
        chatInput.value = current.join(" ") + userlistlist[count];
        count++;
      } else {
        // do matching here
        cycling = false;
        count = 0;
      }
      setFocus();
      break;
      
  }
});

function setFocus(){
  setTimeout(function() {
      document.getElementById('chatInput').focus()
  }, 10);
}

/////
//
// other functions
//
/////

// display users
function getUsers(json) {
  var users = json.data;
  userlistlist = users;
  userlist.innerHTML = "";
  for (let i = 0; i < json.length; i++) {
    userlist.innerHTML += '<usernames>' + users[i] + '</usernames>';
  }
}

// for getting connection status eventually
function pingServer(url) {

}

// spawn menu when a username is right-clicked
function openUserMenu(x, y) {
  let div = document.createElement("div");
  let userMenu = document.createElement("userMenu");
  let userlistY = document.getElementById("chatFrame").getBoundingClientRect().top;
  
  // set co-ords at mouse position offset by Y relative to viewport top
  userMenu.style.left = x - 110 + "px";
  userMenu.style.top = userlistY + y - 100 + "px";
  
  // populate menu
  // todo: map items to specific functions and send selected command to server
  let item1, item2, item3, item4, item5, item6, item7, item8;
  var items = [item1, item2, item3, item4, item5, item6, item7, item8];
  
  for (let i = 0; i < items.length; i++) {
    items[i] = document.createElement("item" + i + 1);
    items[i].innerHTML = "stuff" + i;
    userMenu.appendChild(items[i]);
  }

  // put items/options into menu 
  div.appendChild(userMenu);

  // add menu to userlist area
  document.getElementById("userList").appendChild(div);
  
  // return top level div container
  return div;
}

function closeUserMenu(menu) {
  document.getElementById("userList").removeChild(menu);
}

// autoscroll elements on overflow
function gotoBottom(id){
  var element = document.getElementById(id);
  element.scrollTop = element.scrollHeight - element.clientHeight;
}
