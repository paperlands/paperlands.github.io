// TurtleMonad class for managing state and commands'
//
import Turtle from './turtling/turtle.js';
import {parseProgram } from "./turtling/parse.js"
var x = null
var y = null

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
        //turtle.executeBody(commands, {});
        turtle.draw(commands)

        // Display output
        output.innerHTML = `${turtle.commandCount}`;
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
