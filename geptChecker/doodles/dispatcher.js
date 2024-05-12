/*
-- dispatcher = database of each 'service'
-- register() = a function adds itself to the database, listed under the service it requires; it can only register once
-- dispatch(service) = checks the db and sends a message to all subscribers to that service

a function that wants to partake must start with a helper function that:
1) registers if it is the first visit
2) performs the necessary actions if the subscription is activated
To do this, the helper function must ignore the regular parameters sent to the function and identify its own, i.e. it is activated if the 1st param = "__SUB*_"
*/


function funcA() {
  let [service, subscriber, msg] = register("RESET", funcA);
  console.log("!!!!", this.name, funcA.name, msg);
}

function funcB() {
  let [service, subscriber, msg] = register("RESET", funcB);
  console.log(msg);
}

function funcC() {
  let [service, subscriber, msg] = register("UPDATE", funcC);
  console.log(msg);
}

function dispatchReg(service, subscriber) {
  return;
}

function register(service, subscriber) {
  // console.log("reg:", service, source.name, !!dispatcher.users[channel].length)
  let msg = `reg: ${service} `;
  if (dispatcher.subscriptions[service].includes(subscriber)) {
    msg += "already registered";
  }
  else {
    //dispatcher.users[channel] = [];
    dispatcher.subscriptions[service].push(subscriber);
    msg += "successfully registered!";
  }
  msg += ` for ${subscriber.name}`;
  return [subscriber, service, msg];
}

function dispatch(requiredService, msg) {
  if (!(requireService || msg)) return;
  for (const [service, subscribers] of Object.entries(dispatcher.subscriptions)) {
    for (const subscriber of subscribers) {
      console.log("info:", subscriber.name, service);
    }
  }
}


const dispatcher = {
  subscriptions: {
    "RESET": [],
    "UPDATE": [],
  },
  activate: "__SUB*_",
}


funcA()
//funcB()
//funcC()
//funcA()
//dispatch("RESET")
//console.log(dispatcher.users)

