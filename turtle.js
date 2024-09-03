// TurtleMonad class for managing state and commands'
var x = null
var y = null

class ASTNode {
    constructor(type, value, children = [], meta = {}) {
        this.type = type;
        this.value = value;
        this.meta = meta;
        this.children = children;
        this.left = children[0]
        this.right = children[1]
    }
}

class MafsParser {
    // take it to the shuntingyard
    constructor() {
        this.precedence = {
            '+': 1, '-': 1,
            '*': 2, '/': 2,
            '^': 3
        };
    }

    run(expression) {
        const tokens = this.tokenise(expression);
        const output = [];
        const operators = [];

        for (const token of tokens) {
            if (this.isOperand(token)) {
                output.push(new ASTNode('operand', token));
            } else if (token in this.precedence) {
                while (operators.length > 0 &&
                       this.precedence[operators[operators.length - 1]] >= this.precedence[token]) {
                    this.createOperatorNode(operators, output);
                }
                operators.push(token);
            } else if (token === '[') {
                operators.push(token);
            } else if (token === ']') {
                while (operators.length > 0 && operators[operators.length - 1] !== '[') {
                    this.createOperatorNode(operators, output);
                }
                operators.pop(); // Remove '('
            }
        }

        while (operators.length > 0) {
            this.createOperatorNode(operators, output);
        }

        return output[0]; // The root of the AST
    }

    tokenise(expression) {
        return expression.match(/\d+\.?\d*|[a-zA-Z]+|\S/g) || [];
    }

    isOperand(token) {
        return /^\d+\.?\d*$/.test(token) || /^[a-zA-Z]+$/.test(token);
    }

    createOperatorNode(operators, output) {
        const operator = operators.pop();
        const right = output.pop();
        const left = output.pop();
        output.push(new ASTNode('operator', operator, [left, right]));
    }
}

class MafsEvaluator {
    run(ast, context) {
        if (ast.type === 'operand') {
            if (/^\d+\.?\d*$/.test(ast.value)) {
                return parseFloat(ast.value);
            } else {
                return this.resolveContext(ast.value, context);
            }
        } else if (ast.type === 'operator') {
            const left = this.run(ast.left, context);
            const right = this.run(ast.right, context);
            return this.applyOperator(ast.value, left, right);
        }
    }

    resolveContext(variable, context) {
        if (variable in context) {
            return context[variable];
        }
        throw new Error(`Undefined variable: ${variable}`);
    }

    applyOperator(operator, left, right) {
        switch (operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '^': return Math.pow(left, right);
            default: throw new Error(`Unknown operator: ${operator}`);
        }
    }
}



function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
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

        // Command execution tracking
        this.commandCount = 0;
        this.maxCommands = 8888;
        this.maxRecurse = 8


        //mafs
        this.math = {
            parser: new MafsParser(),
            evaluator: new MafsEvaluator()
        }
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

    callFunction(name, args, depth =0) {
        if (depth >= this.maxRecurse) {
            this.forward(0.01)
            return;
        }
        const func = this.functions[name];
        if (!func)
        {this.callCommand(name, ...args)}
        else
        {
            const context = {};
            func.parameters.forEach((param, index) => {
                context[param] = args[index];
            });
            context['__depth__'] = depth;
            return this.executeBody(func.body, context);
        }
    }

    callCommand(commandName, ...args) {
        const com = this.commands[commandName];
        if (com) {
            if (this.commandCount >= this.maxCommands) {
                throw new Error(`Maximum command limit of ${this.maxCommands} reached`);
            }
            this.commandCount++;
            com(...args); // Call the command with its arguments
        } else {
            throw new Error(`Function ${commandName} not defined`);
        }
    }

    executeBody(body, context) {
        body.forEach(node => {
            switch (node.type) {
            case 'Loop':
                const times = this.evaluateExpression(node.value, context); // is context getting dereferenced fi needed
                for (let i = 0; i < times; i++) {
                    this.executeBody(node.children, context);
                }
                break;
            case 'Call':
                const args = node.children.map(arg => this.evaluateExpression(arg.value, context));
                const currDepth = context['__depth__'] || 0;
                this.callFunction(node.value, args, currDepth + 1); // ...args
                break;

            case 'Define':
                const params = node.meta?.args?.map(n => n.value) || []
                this.defineFunction(node.value,  params, node.children)
                break;
            }
        });
   }

    evaluateExpression(expr, context) {
        if (isNumeric(expr)) return parseFloat(expr);
        if (context[expr]) return context[expr];
        const tree = this.math.parser.run(expr)
        if (tree.children.length > 1) return this.math.evaluator.run(tree, context);
        return tree.value // probably a string
    }

    reset() {
        if( this.x == undefined ) {
            this.spawn();
        }

        const scrolly = (this.y > window.innerHeight) && (this.y + window.innerHeight / 2) || this.y
        window.scrollTo(this.x , scrolly);
        this.angle = 0;
        this.penDown = true;
        this.color = 'red';
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
//
function tokenize(program) {
    return program
        .replace(/\)\)/g, ')\n)') // line feed if cosecutive closing ps
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

// Helper function to parse a single line into tokens
function parseTokens(line) {
    const [code, commie] = line.split('#')
    return [code.trim().split(/\s+/), new ASTNode('Lit', commie)];
}

// Helper function to parse a block of lines
function parseBlock(lines, blockStack) {
    const block = [];
    blockStack.push(block);
    while (lines.length > 0) {
        const line = lines.shift();
        if (line === ')') {
            return blockStack.pop();
        }
        block.push(parseLine(line, lines, blockStack));
    }
    throw new Error("Unmatched opening parenthesis");
}

// Function to parse a single line
function parseLine(line, lines, blockStack) {
    const [tokens, litcomment] = parseTokens(line);
    const command = tokens.shift();
    if (command === 'for') {
        const times = tokens.shift();
        if (tokens.shift() !== '(') throw new Error("Expected '(' after 'for'");
        return new ASTNode('Loop', times, parseBlock(lines, blockStack));
    } else if (command === 'draw') {
        const funcName = tokens.shift();
        if (tokens.pop() !== '(') throw new Error("Expected '(' at the end of 'draw'");
        const args = tokens.map(arg => new ASTNode('Argument', arg));
        return new ASTNode('Define', funcName, parseBlock(lines, blockStack), {args: args} );
    } else if (!command) {
        return litcomment;
    }
    else {
        const args = tokens.map(arg => new ASTNode('Argument', arg));
        return new ASTNode('Call', command, args);
    }
}

// Main function to parse the entire program
function parseProgram(program) {
  const lines = tokenize(program);
  const ast = [];
  const blockStack = [ast];

  while (lines.length > 0) {
    const line = lines.shift();
    blockStack[blockStack.length - 1].push(parseLine(line, lines, blockStack));
  }

  if (blockStack.length > 1) {
    throw new Error("Unmatched opening parenthesis");
  }

  return ast;
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
        const commands = parseProgram(code);

        // Clear canvas
        turtle.ctx.clearRect(0, 0, canvas.width, canvas.height);
        turtle.reset();

        // Execute all instructions
        turtle.executeBody(commands, {});
        turtle.drawTurtle()

        // Display output
        output.innerHTML = `Instructions executed: ${turtle.commandCount}`;
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
    return localStorage.getItem('@my.turtle') || `
hd
draw spiral size fo fi (
 beColour orange
 # arc begins
 for 360/[2*4] (
  fw size
  rt 2
 )
  #fibonacci recurse
 spiral size*[fo+fi]/fi fi fi+fo
)
spiral 1 1 1`;
}


shell.on('change', function(cm, change) {
    saveEditorContent();
    debouncedRunCode()
})

// Run initial program
runCode();
