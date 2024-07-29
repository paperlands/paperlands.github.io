// TurtleMonad class for managing state and commands'
var x = null
var y = null

class TurtleMonad {
    constructor(value, commands = []) {
        this.value = value;
        this.commands = commands;
    }

    static of(value) {
        return new TurtleMonad(value);
    }

    map(fn) {
        return new TurtleMonad(fn(this.value), this.commands);
    }

    flatMap(fn) {
        const result = fn(this.value);
        return new TurtleMonad(result.value, this.commands.concat(result.commands));
    }

    addCommand(command) {
        return new TurtleMonad(this.value, [...this.commands, command]);
    }

    bind(fn) {
        const result = fn(this.value);
        return new TurtleMonad(
            result.value,
            this.commands.concat(result.commands)
        );
    }


    static run(expressions) {
        return expressions.reduce(
            (acc, expr) => acc.bind(() => expr),
            TurtleMonad.of(null)
        );
    }

}

// Command classes
class Command {
    execute(turtle) {}
}

class Forward extends Command {
    constructor(distance) {
        super();
        this.distance = distance;
    }
    execute(turtle) {
        turtle.forward(this.distance);
    }
}

class Right extends Command {
    constructor(angle) {
        super();
        this.angle = angle;
    }
    execute(turtle) {
        turtle.right(this.angle);
    }
}

class Left extends Command {
    constructor(angle) {
        super();
        this.angle = angle;
    }
    execute(turtle) {
        turtle.left(this.angle);
    }
}

class PenUp extends Command {
    constructor() {
        super();
        this.penDown = false
    }
}

class PenDown extends Command {
    constructor() {
        super();
        this.penDown = true
    }
}

class SetColor extends Command {
    constructor(color) {
        super();
        this.color = color;
    }
    execute(turtle) {
        turtle.setColor(this.color);
    }
}

// Turtle class for actual drawing
class Turtle {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.reset();
    }

    spawn() {
        const fl = 2
        const  cl = 8
        x  = x || Math.floor(Math.random() * (cl - fl ) ) + fl
        y  = y || Math.floor(Math.random() * (cl - fl ) ) + fl
        this.x = this.ctx.canvas.width / x;
        this.y = this.ctx.canvas.height / y;
    }

    reset() {
        if( this.x == undefined ) {
            this.spawn();
        }

        const scrolly = (this.y > window.innerHeight) && (this.y + window.innerHeight / 2) || this.y
        window.scrollTo(this.x , scrolly);
        this.angle = 0;
        this.penDown = true;
        this.color = 'blue';
        this.ctx.strokeStyle = this.color;
        this.ctx.beginPath();
        this.ctx.moveTo(this.x, this.y);
        this.showTurtle = true;
    }

    forward(distance) {
        const newX = this.x + distance * Math.cos(this.angle * Math.PI / 180);
        const newY = this.y + distance * Math.sin(this.angle * Math.PI / 180);
        if (this.penDown) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.x, this.y);
            this.ctx.lineTo(newX, newY);
            this.ctx.stroke();
        }
        this.x = newX;
        this.y = newY;
        //this.drawTurtle();
    }

    right(angle) {
        this.angle += angle;
    }

    left(angle) {
        this.angle -= angle;
    }

    noPen() {
        this.penDown = false;
    }

    oPen() {
        this.penDown = true;
    }

    drawTurtle() {
        if (this.showTurtle) {
            const headSize = 10;

            this.ctx.save();
            this.ctx.fillStyle = this.color;
            this.ctx.translate(this.x, this.y);
            this.ctx.rotate(this.angle * Math.PI / 180);

            this.ctx.beginPath();
            this.ctx.moveTo(headSize, 0);
            this.ctx.lineTo(-headSize / 2, headSize / 2);
            this.ctx.lineTo(-headSize / 2, -headSize / 2);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();

        //     const headSize = 10;
        //     const headX = this.x + headSize * Math.cos(this.angle * Math.PI / 180);
        //     const headY = this.y + headSize * Math.sin(this.angle * Math.PI / 180);

        //     this.ctx.save();
        //     this.ctx.fillStyle = this.color;
        //     this.ctx.beginPath();
        //     this.ctx.moveTo(headX, headY);
        //     this.ctx.lineTo(
        //         this.x + headSize / 2 * Math.cos((this.angle + 140) * Math.PI / 180),
        //         this.y + headSize / 2 * Math.sin((this.angle + 140) * Math.PI / 180)
        //     );
        //     this.ctx.lineTo(
        //         this.x + headSize / 2 * Math.cos((this.angle - 140) * Math.PI / 180),
        //         this.y + headSize / 2 * Math.sin((this.angle - 140) * Math.PI / 180)
        //     );
        //     this.ctx.closePath();
        //     this.ctx.fill();
        //     this.ctx.restore();
        // }
        }}

    hideTurtle() {
        this.showTurtle = false;
    }

    unhideTurtle() {
        this.showTurtle = true;
    }

    setColor(color) {
        this.color = color;
        this.ctx.strokeStyle = this.color;
    }
}

// Command functions
const fw = distance => new TurtleMonad(null).addCommand(new Forward(distance));
const jmp = distance => new TurtleMonad(null).addCommand({
    execute: (turtle) => turtle.noPen()
}).addCommand(new Forward(distance)).addCommand({
    execute: (turtle) => turtle.oPen()
});
const right = angle => new TurtleMonad(null).addCommand(new Right(angle));
const left = angle => new TurtleMonad(null).addCommand(new Left(angle));
const hideTurtle = () => new TurtleMonad(null).addCommand({
    execute: (turtle) => turtle.hideTurtle()
});
const showTurtle = () => new TurtleMonad(null).addCommand({
    execute: (turtle) => turtle.unhideTurtle()
});
const drawTurtle = () => new TurtleMonad(null).addCommand({
    execute: (turtle) => turtle.drawTurtle()
});
const setColor = color => new TurtleMonad(null).addCommand(new SetColor(color));

// Control structures
const repeat = (times, action) =>
    new TurtleMonad(null).flatMap(() =>
        Array(times > 10000 && 10000 || times).fill().reduce(acc => acc.flatMap(action), TurtleMonad.of(null))
    );

// Parser
function tokenize(program) {
    return program.replace(/\(/g, ' ( ')
                 .replace(/\)/g, ' ) ')
                 .trim()
                 .split(/\s+/);
}

function parseExpression(tokens) {
    if (tokens.length === 0) {
        throw new Error("Unexpected end of input");
    }

    const token = tokens.shift();

    if (token === '(') {
        const subExpr = [];
        while (tokens[0] !== ')') {
            if (tokens.length === 0) {
                throw new Error("Mismatched parentheses");
            }
            subExpr.push(parseExpression(tokens));
        }
        tokens.shift(); // Remove closing parenthesis
        return subExpr;
    } else if (token === 'for') {
        const times = Number(tokens.shift());
        const action = parseExpression(tokens);
        return repeat(times, () => TurtleMonad.run(action));
    } else {
        switch (token) {
            case 'fw': return fw(Number(tokens.shift()));
            case 'rt': return right(Number(tokens.shift()));
            case 'lt': return left(Number(tokens.shift()));
            case 'jmp': return jmp(Number(tokens.shift()));
            case 'penUp': return penUp();
            case 'penDown': return penDown();
            case 'hd': return hideTurtle();
            case '!hd': return showTurtle();
            case 'beColour': return setColor(tokens.shift());
            default: throw new Error(`Unknown command: ${token}`);
        }
    }
}

function parseProgram(program) {
    const tokens = tokenize(program);
    const expressions = [];
    while (tokens.length > 0) {
        expressions.push(parseExpression(tokens));
    }
    expressions.push(drawTurtle())
    return TurtleMonad.of(null).flatMap(() => TurtleMonad.run(expressions));
}

// UI setup
const canvas = document.getElementById('canvas');
// upres canvas

// const observer = new ResizeObserver((entries) => {
//   width = canvas.clientWidth;
//   height = canvas.clientHeight;
// });
// observer.observe(canvas)

const editor = document.getElementById('editor');

let shell = CodeMirror.fromTextArea(editor, {theme: "abbott",
                                               mode: "apl",
                                             lineNumbers: true,
                                             styleActiveLine: true,
                                             autocorrect: true,
                                             extraKeys: {
                                                 "Ctrl-Space": function() {
      snippet()
    }}});

 const snippets = [
    { text: 'fw 1', displayText: 'go forward 1 unit' },
    { text: 'hd', displayText: 'hide turtle' },
    { text: 'jmp 1', displayText: 'jump by 1 unit' },
     { text: 'rt 90', displayText: 'turn right angle 90' },
     { text: 'lt 90', displayText: 'turn left angle 90 ' },
     { text: 'for 2 ()', displayText: 'repeat twice' },
  ];

  function snippet() {
    CodeMirror.showHint(shell, function () {
      const cursor = shell.getCursor();
      const token = shell.getTokenAt(cursor);
      const start = token.start;
      const end = cursor.ch;
      const line = cursor.line;
      const currentWord = token.string;

      const list = snippets.filter(function (item) {
        return item.text.indexOf(currentWord) >= 0;
      });

      return {
        list: list.length ? list : snippets,
        from: CodeMirror.Pos(line, start),
        to: CodeMirror.Pos(line, end)
      };
    }, { completeSingle: true });
  }
const output = document.getElementById('output');

function runCode() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const turtle = new Turtle(canvas);
    //const code = editor.value()
    const code = shell.getValue();


    try {
        const result = parseProgram(code);

        // Clear canvas
        turtle.ctx.clearRect(0, 0, canvas.width, canvas.height);
        turtle.reset();

        // Execute all instructions
        result.commands.forEach(command => command.execute(turtle));
        // Display output
        output.innerHTML = `Instructions executed: ${result.commands.length}`;
    } catch (error) {
        output.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Set up event listeners
const debouncedRunCode = debounce(runCode, 300);

shell.setValue(loadEditorContent());

function saveEditorContent() {
  localStorage.setItem('@my.turtle', shell.getValue());
}

function loadEditorContent() {
  return localStorage.getItem('@my.turtle') || `beColour gold
hd
for 40(
  fw 5
  rt 9
)`;
}


shell.on('change', function(cm, change) {
    saveEditorContent();
    debouncedRunCode()
    })

// Run initial program
runCode();
