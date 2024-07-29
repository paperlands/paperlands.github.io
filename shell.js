
const metasystem = new Metasystem();
const messageBus = new MessageBus();
const boundary = new Boundary();

// Define a custom class
const TurtleClass = metasystem.defineClass('Turtle');
TurtleClass.prototype.defineMethod('forward', function(distance) {
  console.log(`Moving forward ${distance} units`);
});

// Create an instance
const turtle = metasystem.instantiate('Turtle');

// Set up messaging
messageBus.subscribe(turtle, 'move');

// Set up boundaries
boundary.grantPermission(turtle, 'move');

// Send a message
const message = new Message(null, turtle, 'move', [10]);
if (boundary.checkPermission(turtle, 'move')) {
  messageBus.send(message);
}
