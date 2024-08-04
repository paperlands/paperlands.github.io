// TurtleMonad class for managing state and commands'
var x = null
var y = null

class ASTNode {
  constructor(type, value, children = []) {
    this.type = type;
    this.value = value;
    this.children = children;
  }
}

// Turtle class for actual drawing
class Turtle {
    constructor(canvas) {
        this.ctx = canvas.getContext('2d');
        this.reset();
        this.commands = {
            // Add other command references here
            fw: this.forward.bind(this),
            rt: this.right.bind(this),
            lt: this.left.bind(this),
            show: this.unhideTurtle.bind(this),
            hd: this.hideTurtle.bind(this),
            jmp: this.jmp.bind(this),
            beColour: this.setColor.bind(this)
        };
        this.functions = {};
    }

    spawn() {
        const fl = 2
        const  cl = 8
        x  = x || Math.floor(Math.random() * (cl - fl ) ) + fl
        y  = y || Math.floor(Math.random() * (cl - fl ) ) + fl
        this.x = this.ctx.canvas.width / x;
        this.y = this.ctx.canvas.height / y;
    }

    defineFunction(name, parameters, body) {
        this.functions[name] = { parameters, body };
    }

    callFunction(name, args) {
        const func = this.functions[name];
        if (!func)
        {this.callCommand(name, args)}
        else
        {
            const context = {};
            func.parameters.forEach((param, index) => {
                context[param] = args[index];
            });

            this.executeBody(func.body, context);

        }
    }

    callCommand(commandName, ...args) {
        const com = this.commands[commandName];
        if (com) {
            com(...args); // Call the command with its arguments
        } else {
            throw new Error(`Function ${commandName} not defined`);
        }
    }

    executeBody(body, context) {
        body.forEach(node => {
            switch (node.type) {
            case 'Loop':
                const times = context[node.value];
                for (let i = 0; i < times; i++) {
                    this.executeBody(node.children, context);
                }
                break;
            case 'Call':
                const args = node.children.map(arg => context[arg.value] || arg.value);
                this.callFunction(node.value, ...args);
                break;
            }
        });
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

    jmp(distance){

        this.noPen();
        this.forward(distance);
        this.oPen();
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

// Parser
function tokenize(program) {
    return program.replace(/\(/g, ' ( ')
        .replace(/\)/g, ' ) ')
        .trim()
        .split(/\r?\n/)
        .reduce((acc, curr, index) => {
            acc[index] = curr.split(/\s+/); // Split current string by whitespace and store in accu
            return acc;
        }, [])
}

function parseExpression(lines, tokens = []) {

    if (lines.length === 0) {
        throw new Error("Unexpected end of input");
    }

    if (tokens.length === 0) {
        tokens = lines.shift();
    }

    const token = tokens.shift();

    if (token === '(') {
        const subExpr = [];
        while (tokens[0] !== ')') {
            if (tokens.length === 0) {
                throw new Error("Mismatched parentheses");
            }
            subExpr.push(parseExpression(lines, tokens));
        }
        tokens.shift(); // Remove closing parenthesis
        return subExpr;
    } else if (token === 'for') {
        const times = Number(tokens.shift());
        const body = [];
        while (tokens[0] !== ')') {
            if (tokens.length === 0) {
                throw new Error("Mismatched parentheses");
            }
            body.push(parseExpression(tokens));
        }
        tokens.shift(); // Remove closing parenthesis
        return new ASTNode('Loop', times, body);
    } else if (token === 'do') {
        const funcName = tokens.shift();
        const args = [];
        while (tokens[0] && tokens[0] !== '(') {
            args.push(new ASTNode('Argument', tokens.shift()));
        }
        tokens.shift(); // Remove opening parenthesis
        const body = parseExpression(tokens);
        return new ASTNode('Define', funcName, args, body);
    } else {
        const commandName = token;
        const args = [];
        while (tokens[0] && tokens[0] !== ')' && tokens[0] !== '(') {
            args.push(new ASTNode('Argument', tokens.shift()));
        }
        if (tokens[0] === '(') {
            args.push(parseExpression(tokens));
        }
        if (tokens[0] === ')') {
            tokens.shift(); // Remove closing parenthesis if present
        }
        return new ASTNode('Call', commandName, args);
    }
}


function parseProgram(program) {
    const lines = tokenize(program)
    const expressions = [];
    while (lines.length > 0) {
        expressions.push(parseExpression(lines));
    }
    return expressions;
}

// UI setup
const canvas = document.getElementById('canvas');

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
    const code = shell.getValue();


    try {
        const result = parseProgram(code);

        // Clear canvas
        turtle.ctx.clearRect(0, 0, canvas.width, canvas.height);
        turtle.reset();

        // Execute all instructions
        turtle.executeBody(result, {});
        // Display output
        output.innerHTML = `Instructions executed: ${result.length}`;
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
