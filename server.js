//////
// chat backend
// probably the worst code imaginable 
// well, i did try
/////

var http = require('http');
var WebSocketServer = require('websocket').server;

var server = http.createServer(function (req, res) {
  if (req.url == '/status') {
    res.write("status: up");
  } else {
    res.write("connected");
  }
  res.end();
});
server.listen(1337);

ws = new WebSocketServer({
  httpServer: server
});

// populated on open/close
var clients = {};
var connections = [];
var userList = [];
var userNames = {};

// message stuff
var history = [];

ws.on('request', function (request) {
  var connection = request.accept(null, request.origin);
  
  // default list of all client connections for easy access
  connections.push(connection);

  // add duplicate check lol
  const id = Math.floor(Math.random() * 500);
  var userName = "guest" + id;
  clients[id] = { name: userName, conn: connection };
  clients[userName] = id;
  userList.push(userName);
  
  console.log(userList);
  console.log(connection.remoteAddress + " connected. ID: " + id);
  connection.sendUTF(jsonres('status', "connection established" + "<br>" + "please remember to set your username!"));
  console.log("connected clients: " + userList.length);

  // get userlist and send to clients
  clientBroadcast(getUsers());

  // get messages and send to clients
  connection.on('message', function (message) {
    console.log("received message from user:", clients[id].name, "\n", message.utf8Data);

    // check input for commands, return a "special message" if yes, otherwise a normal chat object
    var specmsg = checkInput(message.utf8Data, id);
    if (specmsg) {
      switch (specmsg) {
        case "nickchange":
          connection.sendUTF(jsonres('status', "you are now known as: " + clients[id].name));
          break;
        case "privmsg": 
          break;
        case "badcmd":
          break;
        default: 
          var obj = {
            user: false,
            text: specmsg,
          };
          clientBroadcast(jsonres('chatmessage', obj));    
      } 
    } else {
        var obj = {
          user: clients[id].name,
          text: message.utf8Data,
        };
        clientBroadcast(jsonres('chatmessage', obj));
      }
  });

  connection.on('close', function (connection) {
    console.log(clients[id].name + " disconnected.");
    cleanUp(id);
    clientBroadcast(getUsers());
    //console.log(userList);
  });
});

// lol need to decompose this thing
// return false if no commands
function checkInput(msg, id) {
  if (msg.match('/[a-z]*')) {
    var command = msg.split(" ");
    var response;

    switch (command[0]) {
      case '/nick':
        command.shift();
        let newNick = command.join(" ");
        updateUser(clients[id].name, newNick);
        clients[id].name = newNick;
        clients[newNick] = id;
        clientBroadcast(getUsers());
        return "nickchange";
      
      case '/scroll':
        command.shift();
        msg = command.join(" ");
        response = "<marquee>" + msg + "</marquee>";
        return response;
      
      // chooching
      case '/msg':
        let userIndex;
        command.shift();

        if (command[0] == "" || !command[0]) {
          return "badcmd";
        } else {
          userIndex = clients[command[0]];
          if (userIndex == undefined) {
            //console.log("/msg: invalid user " + userIndex);
            return "badcmd";
          } else {
            command.shift();

            response = command.join(" ");
            var obj = {
              user: clients[id].name,
              text: response
            }

            response = command.join(" ");
            var obj2 = {
              user: clients[userIndex].name,
              text: response
            }

            clientBroadcast(jsonres('privmsgto', obj2), id);
            clientBroadcast(jsonres('privmsg', obj), userIndex);
            console.log("sent msg to " + clients[userIndex].name);
            return "privmsg";
          }
        }
    }
  } else {
    return false;
  }
}

// package response in JSON
function jsonres(type, data) {
  var json = JSON.stringify({
    type: type,
    data: data,
  });
  return json;
}

function clientBroadcast(msg, clientIndex=false) {
  if (typeof(clientIndex) == "number") {
    clients[clientIndex].conn.sendUTF(msg);
  } else {
    for (let i = 0; i < connections.length; i++) {
      connections[i].sendUTF(msg);
    }
  }
}

function getUsers() {
  let userlistlen = userList.length;
  var json = JSON.stringify({
    type: 'users',
    length: userlistlen,
    data: userList
  });
  return json;
}

// called on nick change
// update position of new nick in array
function updateUser(oldnick, newnick) {
  for (let i = 0; i < userList.length; i++) {
    if (userList[i] == oldnick) { userList[i] = newnick; break; }
  }
}

function delUser(user) {
  for (let i = 0; i < userList.length; i++) {
    if (userList[i] == user) { userList.splice(i, 1); break; }
  }
}

// remove all traces of disconnected users
function cleanUp(id) {
  delUser(clients[id].name);
  delete clients[clients[id].name];
  delete clients[id]; 
}
